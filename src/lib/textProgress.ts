/**
 * Progreso de los textos: cuáles se escucharon enteros y la mejor nota de cada lectura en voz alta.
 * Se guarda aparte (`tecla:texts`), como el curso, y viaja en la copia de seguridad.
 */
import { addXp, dayKey } from './progress'
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import { isFiniteNumber, isInteger, isRecord } from './validate'

export interface Listened {
  /** Veces que se escuchó entero. */
  times: number
  /** La última vez. */
  at: number
}

export interface SpokenAttempt {
  /** Mejor acierto de pronunciación (0–1). */
  best: number
  /** Cuándo se consiguió la mejor nota. */
  at: number
  /** La última lectura (aunque no mejorase la nota): con ella se sabe si se practicó hoy. */
  last: number
}

export interface TextProgress {
  listened: Record<string, Listened>
  spoken: Record<string, SpokenAttempt>
}

/** Experiencia por escuchar un texto entero (la primera vez, más) y por leerlo en voz alta. */
export const XP_LISTEN_FIRST = 25
export const XP_LISTEN_AGAIN = 5
/** Por cada palabra bien pronunciada, y un extra la primera vez que se supera SPOKEN_PASS. */
export const XP_SPOKEN_WORD = 1
export const XP_SPOKEN_PASS = 30
/** Acierto con el que una lectura en voz alta cuenta como superada. */
export const SPOKEN_PASS = 0.8

const ID = /^[a-z0-9-]+$/
const ratio = (value: number) => Math.min(1, Math.max(0, value))

export function parseTextProgress(raw: unknown): TextProgress {
  const listened: Record<string, Listened> = {}
  const spoken: Record<string, SpokenAttempt> = {}
  if (isRecord(raw)) {
    if (isRecord(raw.listened)) {
      for (const [id, value] of Object.entries(raw.listened)) {
        if (ID.test(id) && isRecord(value) && isInteger(value.times, 1) && isFiniteNumber(value.at)) {
          listened[id] = { times: value.times, at: value.at }
        }
      }
    }
    if (isRecord(raw.spoken)) {
      for (const [id, value] of Object.entries(raw.spoken)) {
        if (ID.test(id) && isRecord(value) && isFiniteNumber(value.best) && isFiniteNumber(value.at)) {
          const last = isFiniteNumber(value.last) ? Math.max(value.last, value.at) : value.at
          spoken[id] = { best: ratio(value.best), at: value.at, last }
        }
      }
    }
  }
  return { listened, spoken }
}

export const EMPTY_TEXT_PROGRESS: TextProgress = { listened: {}, spoken: {} }

export const TEXT_PROGRESS_SCHEMA: VersionedSchema<TextProgress> = {
  version: 1,
  migrations: {},
  parse: parseTextProgress,
}

const store = createPersistedStore<TextProgress>({
  ...TEXT_PROGRESS_SCHEMA,
  key: 'tecla:texts',
  fallback: EMPTY_TEXT_PROGRESS,
})

export const useTextProgress = () => useStore(store)
export const getTextProgress = () => store.get()

/** Anota un texto escuchado de principio a fin y suma la experiencia. */
export function recordListened(id: string, now = Date.now()) {
  const data = store.get()
  const previous = data.listened[id]
  store.set({ ...data, listened: { ...data.listened, [id]: { times: (previous?.times ?? 0) + 1, at: now } } })
  addXp(previous ? XP_LISTEN_AGAIN : XP_LISTEN_FIRST)
}

/**
 * Anota una lectura en voz alta: la mejor nota manda. Suma experiencia por cada palabra bien dicha
 * y, la primera vez que se supera, el premio.
 */
export function recordSpoken(id: string, correctWords: number, score: number, now = Date.now()) {
  const data = store.get()
  const previous = data.spoken[id]
  const firstPass = score >= SPOKEN_PASS && !((previous?.best ?? 0) >= SPOKEN_PASS)
  const best = previous && previous.best >= score ? previous : { best: ratio(score), at: now }
  store.set({ ...data, spoken: { ...data.spoken, [id]: { best: best.best, at: best.at, last: now } } })
  addXp(correctWords * XP_SPOKEN_WORD + (firstPass ? XP_SPOKEN_PASS : 0))
}

export const spokenPassed = (progress: TextProgress, id: string) => (progress.spoken[id]?.best ?? 0) >= SPOKEN_PASS

/** ¿Se escuchó algún texto entero hoy? ¿Se leyó alguno en voz alta? (para el plan de estudio) */
export function textsToday(progress: TextProgress, now = Date.now()) {
  const today = dayKey(now)
  return {
    listened: Object.values(progress.listened).some((entry) => dayKey(entry.at) === today),
    spoken: Object.values(progress.spoken).some((entry) => dayKey(entry.last) === today),
  }
}

export function replaceTextProgress(next: TextProgress) {
  store.set(next)
}

export function resetTextProgress() {
  store.set(EMPTY_TEXT_PROGRESS)
}

/** Dos progresos en uno: de cada texto, lo más avanzado (más escuchas, mejor nota). */
export function mergeTextProgress(current: TextProgress, incoming: TextProgress): TextProgress {
  const listened = { ...current.listened }
  for (const [id, entry] of Object.entries(incoming.listened)) {
    const mine = listened[id]
    listened[id] = mine ? { times: Math.max(mine.times, entry.times), at: Math.max(mine.at, entry.at) } : entry
  }
  const spoken = { ...current.spoken }
  for (const [id, entry] of Object.entries(incoming.spoken)) {
    const mine = spoken[id]
    if (!mine) {
      spoken[id] = entry
      continue
    }
    const best = entry.best > mine.best || (entry.best === mine.best && entry.at < mine.at) ? entry : mine
    spoken[id] = { best: best.best, at: best.at, last: Math.max(mine.last, entry.last) }
  }
  return { listened, spoken }
}
