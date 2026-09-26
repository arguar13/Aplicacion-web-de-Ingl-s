/**
 * Almacén persistido en localStorage al que React se suscribe con useStore().
 *
 * Se sincroniza entre pestañas y, si el navegador no deja guardar (modo privado, cuota llena),
 * sigue funcionando en memoria.
 */
import { useSyncExternalStore } from 'react'

export interface PersistedStore<T> {
  get(): T
  set(next: T): void
  subscribe(listener: () => void): () => void
  fallback: T
}

export function createPersistedStore<T>(key: string, fallback: T, parse: (raw: unknown) => T): PersistedStore<T> {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? parse(JSON.parse(raw)) : fallback
    } catch {
      return fallback
    }
  }

  let value = typeof window === 'undefined' ? fallback : read()
  const listeners = new Set<() => void>()
  const emit = () => {
    for (const listener of listeners) listener()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== key) return
      value = read()
      emit()
    })
  }

  return {
    fallback,
    get: () => value,
    set(next) {
      value = next
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Sin almacenamiento disponible: el valor dura lo que dure la pestaña.
      }
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: PersistedStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.fallback)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
