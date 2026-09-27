/** Preferencias del usuario, guardadas en el dispositivo. */
import { createPersistedStore, useStore } from './store'
import type { Direction } from './types'

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  direction: Direction
  /** Reproducir la pronunciación sin que el usuario la pida. */
  autoplay: boolean
  theme: ThemePreference
}

/** Clave de almacenamiento; index.html la lee antes de pintar para aplicar el tema sin parpadeo. */
export const SETTINGS_KEY = 'tecla:settings:v1'

const DEFAULTS: Settings = { direction: 'en-es', autoplay: true, theme: 'system' }

export const SETTINGS_VERSION = 1

export function parseSettings(raw: Record<string, unknown>): Settings {
  return {
    direction: raw.direction === 'es-en' ? 'es-en' : 'en-es',
    autoplay: typeof raw.autoplay === 'boolean' ? raw.autoplay : DEFAULTS.autoplay,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'system',
  }
}

const store = createPersistedStore<Settings>({
  key: SETTINGS_KEY,
  version: SETTINGS_VERSION,
  fallback: DEFAULTS,
  parse: parseSettings,
})

export const useSettings = () => useStore(store)
export const getSettings = () => store.get()
export const subscribeSettings = store.subscribe

export function updateSettings(patch: Partial<Settings>) {
  store.set({ ...store.get(), ...patch })
}
