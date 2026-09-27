/** Progreso del usuario: estado de cada palabra, días practicados y récord. */
import { appendEvent, clearEvents } from './events'
import { type CardState, fromLeitner, gradeAnswer, isMastered, parseCard, review } from './scheduler'
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import { TRACKS, type Track } from './types'
import { isDayKey, isFiniteNumber, isInteger, isRecord } from './validate'

/** Días de práctica que se conservan para calcular la racha. */
const MAX_DAYS = 400

/** Lo estudiado en un día (todos los sentidos). */
export interface DayStats {
  /** Palabras respondidas. */
  answers: number
  /** Acertadas a la primera. */
  clean: number
  /** Palabras nuevas vistas por primera vez. */
  fresh: number
  /** Tiempo de estudio aproximado (ms): suma de lo que tardó cada respuesta, con tope. */
  ms: number
  /** Palabras dominadas (en alguna habilidad) al final del día. Desde la Fase 10. */
  mastered?: number
}

export interface ProgressData {
  /** Estado de cada palabra en cada habilidad, con clave `${track}:${wordId}`. */
  cards: Record<string, CardState>
  /** Días con práctica, en formato AAAA-MM-DD y hora local, de más antiguo a más reciente. */
  days: string[]
  /** Resumen de cada día estudiado (desde la Fase 8), con clave AAAA-MM-DD. */
  history: Record<string, DayStats>
  bestStreak: number
  /** Récord de Relámpago (palabras acertadas en 60 s). */
  blitzBest: number
  /** Palabras marcadas como favoritas (ids). Desde la Fase 10. */
  favorites: string[]
  lastDeckId: string | null
}

/** Una respuesta cuenta como mucho esto en el tiempo de estudio: una pausa no infla el total. */
const MAX_ANSWER_MS = 30_000
export const EMPTY_DAY: DayStats = { answers: 0, clean: 0, fresh: 0, ms: 0 }

function parseDayStats(raw: unknown): DayStats | null {
  if (!isRecord(raw)) return null
  const { answers, clean, fresh, ms } = raw
  if (!isInteger(answers, 0) || !isInteger(clean, 0) || !isInteger(fresh, 0) || !isFiniteNumber(ms) || ms < 0)
    return null
  const stats: DayStats = { answers, clean: Math.min(clean, answers), fresh: Math.min(fresh, answers), ms }
  if (isInteger(raw.mastered, 0)) stats.mastered = raw.mastered
  return stats
}

export const EMPTY_PROGRESS: ProgressData = {
  cards: {},
  days: [],
  history: {},
  bestStreak: 0,
  blitzBest: 0,
  favorites: [],
  lastDeckId: null,
}
const EMPTY = EMPTY_PROGRESS

/** El "v1" de la clave es histórico: la versión del esquema va en el campo `version`. */
export const PROGRESS_KEY = 'tecla:progress:v1'
export const PROGRESS_VERSION = 2

const CARD_KEY = new RegExp(`^(${TRACKS.join('|')}):[a-z0-9-]+$`)

/**
 * Valida el progreso guardado. Cada tarjeta se valida por separado: una entrada dañada se descarta
 * sin arrastrar al resto.
 */
export function parseProgress(raw: Record<string, unknown>): ProgressData {
  const cards: Record<string, CardState> = {}
  if (isRecord(raw.cards)) {
    for (const [key, value] of Object.entries(raw.cards)) {
      const card = CARD_KEY.test(key) ? parseCard(value) : null
      if (card) cards[key] = card
    }
  }
  const days = Array.isArray(raw.days) ? [...new Set(raw.days.filter(isDayKey))].toSorted().slice(-MAX_DAYS) : []
  // Campo añadido en la Fase 8: lo guardado antes no lo tiene y empieza vacío.
  const history: Record<string, DayStats> = {}
  if (isRecord(raw.history)) {
    for (const key of Object.keys(raw.history).filter(isDayKey).toSorted().slice(-MAX_DAYS)) {
      const stats = parseDayStats(raw.history[key])
      if (stats) history[key] = stats
    }
  }
  return {
    cards,
    days,
    history,
    bestStreak: isInteger(raw.bestStreak, 0) ? raw.bestStreak : 0,
    // Campo añadido en la Fase 9.
    blitzBest: isInteger(raw.blitzBest, 0) ? raw.blitzBest : 0,
    // Campo añadido en la Fase 10.
    favorites: Array.isArray(raw.favorites)
      ? [...new Set(raw.favorites.filter((id): id is string => typeof id === 'string'))]
      : [],
    lastDeckId: typeof raw.lastDeckId === 'string' ? raw.lastDeckId : null,
  }
}

/**
 * v1 → v2 (Fase 8): las tarjetas Leitner { box, due, seen, lapses } pasan a FSRS. Las que no
 * tienen la forma esperada se descartan aquí, igual que las descartaría la validación.
 */
export function migrateLeitnerToFsrs(raw: Record<string, unknown>): Record<string, unknown> {
  const cards: Record<string, CardState> = {}
  if (isRecord(raw.cards)) {
    for (const [key, value] of Object.entries(raw.cards)) {
      if (!isRecord(value)) continue
      const { box, due, seen, lapses } = value
      if (isInteger(box, 1, 6) && isFiniteNumber(due) && isInteger(seen, 0) && isInteger(lapses, 0)) {
        cards[key] = fromLeitner(box, due, seen, lapses)
      }
    }
  }
  return { ...raw, cards }
}

export const PROGRESS_SCHEMA: VersionedSchema<ProgressData> = {
  version: PROGRESS_VERSION,
  migrations: { 1: migrateLeitnerToFsrs },
  parse: parseProgress,
}

const store = createPersistedStore<ProgressData>({ ...PROGRESS_SCHEMA, key: PROGRESS_KEY, fallback: EMPTY })

export const useProgress = () => useStore(store)
export const getProgress = () => store.get()

export const cardKey = (track: Track, id: string) => `${track}:${id}`

/** Función de consulta de tarjetas para un sentido concreto, lista para el planificador. */
export function cardLookup(progress: ProgressData, track: Track) {
  return (id: string) => progress.cards[cardKey(track, id)]
}

export function dayKey(time: number): string {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Días seguidos practicando, contando hoy o, si hoy aún no, hasta ayer. */
export function dailyStreak(days: readonly string[], now: number): number {
  const practiced = new Set(days)
  const cursor = new Date(now)
  if (!practiced.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (practiced.has(dayKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export interface Answer {
  /** Acertada sin fallar ninguna tecla. */
  clean: boolean
  /** Tiempo hasta acertar, en ms. */
  ms: number
  /** Modo escribir: acertada con un error de tecleo. */
  almost?: boolean
}

export function recordAnswer(track: Track, id: string, answer: Answer, now = Date.now()): CardState {
  const data = store.get()
  const key = cardKey(track, id)
  const previous = data.cards[key]
  const card = review(previous, gradeAnswer({ ...answer, isNew: !previous }), now)
  appendEvent({
    t: now,
    id,
    track,
    r: !answer.clean ? 'miss' : answer.almost ? 'almost' : 'clean',
    ms: Math.round(answer.ms),
  })
  const cards = { ...data.cards, [key]: card }
  const today = dayKey(now)
  const days = data.days.at(-1) === today ? data.days : [...data.days, today].slice(-MAX_DAYS)
  const stats = data.history[today] ?? EMPTY_DAY
  const history = {
    ...data.history,
    [today]: {
      answers: stats.answers + 1,
      clean: stats.clean + (answer.clean ? 1 : 0),
      fresh: stats.fresh + (previous ? 0 : 1),
      ms: stats.ms + Math.min(Math.max(answer.ms, 0), MAX_ANSWER_MS),
      mastered: countMastered(cards),
    },
  }
  store.set({ ...data, cards, days, history: trimHistory(history) })
  return card
}

/** Palabras distintas dominadas en alguna habilidad. */
export function countMastered(cards: Record<string, CardState>): number {
  const words = new Set<string>()
  for (const [key, card] of Object.entries(cards)) {
    if (isMastered(card)) words.add(key.slice(key.indexOf(':') + 1))
  }
  return words.size
}

/** Conserva los últimos MAX_DAYS días de historial. */
function trimHistory(history: Record<string, DayStats>): Record<string, DayStats> {
  const keys = Object.keys(history)
  if (keys.length <= MAX_DAYS) return history
  return Object.fromEntries(
    keys
      .toSorted()
      .slice(-MAX_DAYS)
      .map((key) => [key, history[key]]),
  )
}

/** Lo estudiado hoy (o el día de `now`). */
export const todayStats = (progress: ProgressData, now = Date.now()) => progress.history[dayKey(now)] ?? EMPTY_DAY

/** Suma práctica al día sin tocar las tarjetas (Relámpago). */
export function recordPractice(practice: { answers: number; clean: number; ms: number }, now = Date.now()) {
  if (practice.answers === 0) return
  const data = store.get()
  const today = dayKey(now)
  const days = data.days.at(-1) === today ? data.days : [...data.days, today].slice(-MAX_DAYS)
  const stats = data.history[today] ?? EMPTY_DAY
  const history = {
    ...data.history,
    [today]: {
      ...stats,
      answers: stats.answers + practice.answers,
      clean: stats.clean + practice.clean,
      ms: stats.ms + practice.ms,
    },
  }
  store.set({ ...data, days, history: trimHistory(history) })
}

/** Marca o desmarca una palabra como favorita. */
export function toggleFavorite(id: string) {
  const data = store.get()
  const favorites = data.favorites.includes(id) ? data.favorites.filter((f) => f !== id) : [...data.favorites, id]
  store.set({ ...data, favorites })
}

/** Días que se aleja el repaso de una palabra marcada como "ya la sé". */
export const KNOWN_STABILITY_DAYS = 30

/**
 * "Ya la sé": la palabra pasa a dominada en esa habilidad, con el próximo repaso en un mes (el repaso
 * espaciado confirmará si de verdad se sabe). Devuelve el estado anterior para poder deshacerlo.
 */
export function markKnown(track: Track, id: string, now = Date.now()): CardState | undefined {
  const data = store.get()
  const key = cardKey(track, id)
  const previous = data.cards[key]
  const card: CardState = {
    due: now + KNOWN_STABILITY_DAYS * 24 * 60 * 60 * 1000,
    stability: KNOWN_STABILITY_DAYS,
    difficulty: previous?.difficulty ?? 3,
    phase: 'review',
    step: 0,
    reps: (previous?.reps ?? 0) + 1,
    lapses: previous?.lapses ?? 0,
    last: now,
  }
  store.set({ ...data, cards: { ...data.cards, [key]: card } })
  return previous
}

/** Deshace "ya la sé": devuelve la tarjeta a su estado anterior (o a nueva si no existía). */
export function restoreCard(track: Track, id: string, previous: CardState | undefined) {
  const data = store.get()
  const key = cardKey(track, id)
  const cards = { ...data.cards }
  if (previous) cards[key] = previous
  else delete cards[key]
  store.set({ ...data, cards })
}

/** Guarda la puntuación de Relámpago si es récord; devuelve si lo fue. */
export function recordBlitzScore(score: number): boolean {
  const data = store.get()
  if (score <= data.blitzBest) return false
  store.set({ ...data, blitzBest: score })
  return true
}

export function recordStreak(streak: number) {
  const data = store.get()
  if (streak > data.bestStreak) store.set({ ...data, bestStreak: streak })
}

export function setLastDeck(deckId: string) {
  const data = store.get()
  if (data.lastDeckId !== deckId) store.set({ ...data, lastDeckId: deckId })
}

export function resetProgress() {
  store.set(EMPTY)
  clearEvents()
}

/** Sustituye todo el progreso (p. ej. al restaurar una copia). */
export function replaceProgress(data: ProgressData) {
  store.set(data)
}

/**
 * Combina dos progresos sin perder práctica: de cada palabra se queda la versión más trabajada
 * (más veces vista; a igualdad, la de repaso más lejano), los días se unen y el récord es el mayor.
 */
export function mergeProgress(current: ProgressData, incoming: ProgressData): ProgressData {
  const cards = { ...current.cards }
  for (const [key, card] of Object.entries(incoming.cards)) {
    const mine = cards[key]
    if (!mine || card.reps > mine.reps || (card.reps === mine.reps && card.due > mine.due)) cards[key] = card
  }
  // El mismo día en dos dispositivos: se queda el máximo de cada dato (sumar contaría doble si una
  // copia se restaura sobre el dispositivo del que salió).
  const history = { ...current.history }
  for (const [day, stats] of Object.entries(incoming.history)) {
    const mine = history[day] ?? EMPTY_DAY
    history[day] = {
      answers: Math.max(mine.answers, stats.answers),
      clean: Math.max(mine.clean, stats.clean),
      fresh: Math.max(mine.fresh, stats.fresh),
      ms: Math.max(mine.ms, stats.ms),
      ...(mine.mastered !== undefined || stats.mastered !== undefined
        ? { mastered: Math.max(mine.mastered ?? 0, stats.mastered ?? 0) }
        : {}),
    }
  }
  return {
    cards,
    days: [...new Set([...current.days, ...incoming.days])].toSorted().slice(-MAX_DAYS),
    history: trimHistory(history),
    bestStreak: Math.max(current.bestStreak, incoming.bestStreak),
    blitzBest: Math.max(current.blitzBest, incoming.blitzBest),
    favorites: [...new Set([...current.favorites, ...incoming.favorites])],
    lastDeckId: current.lastDeckId ?? incoming.lastDeckId,
  }
}
