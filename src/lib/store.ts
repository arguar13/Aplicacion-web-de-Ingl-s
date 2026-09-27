/**
 * Almacén persistido en localStorage al que React se suscribe con useStore().
 *
 * - Versionado: cada valor se guarda con `version`. Los datos de versiones anteriores pasan por
 *   `migrations` antes de validarse; lo guardado sin `version` es la versión 1.
 * - Validación: `parse` recibe datos de la versión actual sin garantías y devuelve un valor válido.
 * - Recuperación: un JSON ilegible o una migración que falla no rompe la app; el texto original se
 *   copia a `<clave>:respaldo` antes de que nada lo sobrescriba.
 * - Compatibilidad hacia delante: si otra pestaña con una versión más nueva de la app guardó datos
 *   de un esquema posterior, esta pestaña los usa en memoria pero no los sobrescribe.
 * - Se sincroniza entre pestañas y, sin almacenamiento disponible (modo privado, cuota llena),
 *   sigue funcionando en memoria.
 */
import { useSyncExternalStore } from 'react'
import { isRecord } from './validate'

export interface PersistedStore<T> {
  get: () => T
  set: (next: T) => void
  subscribe: (listener: () => void) => () => void
  fallback: T
}

type Raw = Record<string, unknown>

export interface VersionedSchema<T> {
  /** Versión del esquema actual. */
  version: number
  /** Pasos de migración: `migrations[n]` convierte datos de la versión n en datos de la n + 1. */
  migrations?: Readonly<Record<number, (raw: Raw) => Raw>>
  /** Valida y normaliza datos de la versión actual. Nunca debe lanzar. */
  parse: (raw: Raw) => T
}

export interface StoreOptions<T extends object> extends VersionedSchema<T> {
  key: string
  fallback: T
  /** Solo para tests; por defecto, localStorage. */
  storage?: Storage
}

interface Loaded<T> {
  value: T
  /** false si los datos son de una versión posterior de la app: no se deben sobrescribir. */
  writable: boolean
  /** Hay que volver a guardar (p. ej. tras migrar). */
  dirty: boolean
}

export const backupKey = (key: string) => `${key}:respaldo`

export type VersionedResult<T> =
  { status: 'ok'; value: T; migrated: boolean } | { status: 'newer'; value: T } | { status: 'invalid'; reason: string }

/**
 * Lleva un objeto guardado con `version` (o sin ella: versión 1) a la versión actual del esquema y
 * lo valida. Es el mismo camino para lo leído de localStorage y para una copia importada.
 */
export function readVersioned<T>(data: unknown, schema: VersionedSchema<T>): VersionedResult<T> {
  if (!isRecord(data)) return { status: 'invalid', reason: 'No es un objeto' }
  const { version: rawVersion, ...rest } = data
  const from = typeof rawVersion === 'number' ? rawVersion : 1
  if (!Number.isInteger(from) || from < 1)
    return { status: 'invalid', reason: `Versión no válida: ${String(rawVersion)}` }
  if (from > schema.version) return { status: 'newer', value: schema.parse(rest) }

  let migrated: Raw = rest
  for (let v = from; v < schema.version; v++) {
    const step = schema.migrations?.[v]
    if (!step) return { status: 'invalid', reason: `Falta la migración de la versión ${v} a la ${v + 1}` }
    try {
      migrated = step(migrated)
    } catch (error) {
      return { status: 'invalid', reason: error instanceof Error ? error.message : String(error) }
    }
  }
  return { status: 'ok', value: schema.parse(migrated), migrated: from < schema.version }
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    // Algunos navegadores lanzan al acceder a localStorage con las cookies bloqueadas.
    return undefined
  }
}

export function createPersistedStore<T extends object>(options: StoreOptions<T>): PersistedStore<T> {
  const { key, version, fallback } = options
  const storage = options.storage ?? defaultStorage()

  const backup = (text: string) => {
    try {
      storage?.setItem(backupKey(key), text)
    } catch {
      // Sin espacio para el respaldo: se sigue adelante con el valor por defecto.
    }
  }

  const load = (): Loaded<T> => {
    let text: string | null
    try {
      text = storage?.getItem(key) ?? null
    } catch {
      return { value: fallback, writable: true, dirty: false }
    }
    if (text === null) return { value: fallback, writable: true, dirty: false }

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      backup(text)
      return { value: fallback, writable: true, dirty: false }
    }

    const result = readVersioned(data, options)
    switch (result.status) {
      case 'newer':
        return { value: result.value, writable: false, dirty: false }
      case 'invalid':
        console.error(`Datos no válidos en ${key}: ${result.reason}`)
        backup(text)
        return { value: fallback, writable: true, dirty: false }
      case 'ok':
        if (result.migrated) backup(text)
        return { value: result.value, writable: true, dirty: result.migrated }
    }
  }

  let loaded = load()
  let value = loaded.value
  const listeners = new Set<() => void>()
  const emit = () => {
    for (const listener of listeners) listener()
  }

  const persist = () => {
    if (!loaded.writable) return
    try {
      storage?.setItem(key, JSON.stringify({ version, ...value }))
    } catch {
      // Sin almacenamiento disponible: el valor dura lo que dure la pestaña.
    }
  }

  if (loaded.dirty) persist()

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== key) return
      loaded = load()
      value = loaded.value
      emit()
    })
  }

  return {
    fallback,
    get: () => value,
    set: (next) => {
      value = next
      persist()
      emit()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function useStore<T>(store: PersistedStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.fallback)
}
