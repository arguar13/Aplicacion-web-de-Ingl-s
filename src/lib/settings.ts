/** Preferencias del usuario, guardadas en el dispositivo. */
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import type { Direction } from './types'

export type ThemePreference = 'system' | 'light' | 'dark'
/** Cuándo se detiene la partida tras responder para mostrar el detalle (ejemplo, IPA, formas). */
export type DetailsPause = 'mistakes' | 'always' | 'never'

export interface Settings {
  direction: Direction
  /** Reproducir la pronunciación sin que el usuario la pida. */
  autoplay: boolean
  theme: ThemePreference
  detailsPause: DetailsPause
}

/** Clave de almacenamiento; index.html la lee antes de pintar para aplicar el tema sin parpadeo. */
export const SETTINGS_KEY = 'tecla:settings:v1'

const DEFAULTS: Settings = { direction: 'en-es', autoplay: true, theme: 'system', detailsPause: 'mistakes' }

export const SETTINGS_VERSION = 1

export function parseSettings(raw: Record<string, unknown>): Settings {
  return {
    direction: raw.direction === 'es-en' ? 'es-en' : 'en-es',
    autoplay: typeof raw.autoplay === 'boolean' ? raw.autoplay : DEFAULTS.autoplay,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'system',
    // Campo nuevo en la Fase 7: lo guardado antes no lo tiene y toma el valor por defecto.
    detailsPause:
      raw.detailsPause === 'always' || raw.detailsPause === 'never' ? raw.detailsPause : DEFAULTS.detailsPause,
  }
}

export const SETTINGS_SCHEMA: VersionedSchema<Settings> = {
  version: SETTINGS_VERSION,
  migrations: {},
  parse: parseSettings,
}

const store = createPersistedStore<Settings>({ ...SETTINGS_SCHEMA, key: SETTINGS_KEY, fallback: DEFAULTS })

export const useSettings = () => useStore(store)
export const getSettings = () => store.get()
export const subscribeSettings = store.subscribe

export function replaceSettings(next: Settings) {
  store.set(next)
}

export function updateSettings(patch: Partial<Settings>) {
  store.set({ ...store.get(), ...patch })
}
