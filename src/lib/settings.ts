/** Preferencias del usuario, guardadas en el dispositivo. */
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import { MODES, type Mode } from './types'

export type ThemePreference = 'system' | 'light' | 'dark'
/** Cuándo se detiene la partida tras responder para mostrar el detalle (ejemplo, IPA, formas). */
export type DetailsPause = 'mistakes' | 'always' | 'never'

export const DAILY_GOALS = [10, 20, 40, 60] as const
export type DailyGoal = (typeof DAILY_GOALS)[number]
/** Palabras nuevas por día; 0 = sin límite. */
export const NEW_PER_DAY = [10, 20, 40, 0] as const
export type NewPerDay = (typeof NEW_PER_DAY)[number]

export interface Settings {
  /** Cómo se practica (antes `direction`: solo había traducir e inverso). */
  mode: Mode
  /** Reproducir la pronunciación sin que el usuario la pida. */
  autoplay: boolean
  theme: ThemePreference
  detailsPause: DetailsPause
  /** Palabras que responder cada día. */
  dailyGoal: DailyGoal
  /** Palabras nuevas que introducir cada día como mucho (0 = sin límite). */
  newPerDay: NewPerDay
  /** Efectos de sonido al acertar, fallar y cumplir la meta. */
  sounds: boolean
  /** Vibración breve en esos momentos (donde el dispositivo la tenga). */
  haptics: boolean
}

/** Clave de almacenamiento; index.html la lee antes de pintar para aplicar el tema sin parpadeo. */
export const SETTINGS_KEY = 'tecla:settings:v1'

const DEFAULTS: Settings = {
  mode: 'en-es',
  autoplay: true,
  theme: 'system',
  detailsPause: 'mistakes',
  dailyGoal: 20,
  newPerDay: 20,
  sounds: true,
  haptics: true,
}

const oneOf = <T extends number>(options: readonly T[], value: unknown, fallback: T): T =>
  options.find((option) => option === value) ?? fallback

export const SETTINGS_VERSION = 1

export function parseSettings(raw: Record<string, unknown>): Settings {
  return {
    // Hasta la Fase 8 se guardaba `direction` ('en-es' | 'es-en'): sigue valiendo como modo.
    mode: MODES.find((mode) => mode === raw.mode) ?? (raw.direction === 'es-en' ? 'es-en' : DEFAULTS.mode),
    autoplay: typeof raw.autoplay === 'boolean' ? raw.autoplay : DEFAULTS.autoplay,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'system',
    // Campo nuevo en la Fase 7: lo guardado antes no lo tiene y toma el valor por defecto.
    detailsPause:
      raw.detailsPause === 'always' || raw.detailsPause === 'never' ? raw.detailsPause : DEFAULTS.detailsPause,
    // Campos nuevos en la Fase 8.
    dailyGoal: oneOf(DAILY_GOALS, raw.dailyGoal, DEFAULTS.dailyGoal),
    newPerDay: oneOf(NEW_PER_DAY, raw.newPerDay, DEFAULTS.newPerDay),
    // Campos nuevos en la Fase 11.
    sounds: typeof raw.sounds === 'boolean' ? raw.sounds : DEFAULTS.sounds,
    haptics: typeof raw.haptics === 'boolean' ? raw.haptics : DEFAULTS.haptics,
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
