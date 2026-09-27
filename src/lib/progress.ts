/** Progreso del usuario: estado de cada palabra, días practicados y récord. */
import { type CardState, fromLeitner, gradeAnswer, parseCard, review } from './scheduler'
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import type { Direction } from './types'
import { isDayKey, isFiniteNumber, isInteger, isRecord } from './validate'

/** Días de práctica que se conservan para calcular la racha. */
const MAX_DAYS = 400

export interface ProgressData {
  /** Estado de cada palabra, con clave `${direction}:${wordId}`. */
  cards: Record<string, CardState>
  /** Días con práctica, en formato AAAA-MM-DD y hora local, de más antiguo a más reciente. */
  days: string[]
  bestStreak: number
  lastDeckId: string | null
}

export const EMPTY_PROGRESS: ProgressData = { cards: {}, days: [], bestStreak: 0, lastDeckId: null }
const EMPTY = EMPTY_PROGRESS

/** El "v1" de la clave es histórico: la versión del esquema va en el campo `version`. */
export const PROGRESS_KEY = 'tecla:progress:v1'
export const PROGRESS_VERSION = 2

const CARD_KEY = /^(en-es|es-en):[a-z0-9-]+$/

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
  return {
    cards,
    days,
    bestStreak: isInteger(raw.bestStreak, 0) ? raw.bestStreak : 0,
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

export const cardKey = (direction: Direction, id: string) => `${direction}:${id}`

/** Función de consulta de tarjetas para un sentido concreto, lista para el planificador. */
export function cardLookup(progress: ProgressData, direction: Direction) {
  return (id: string) => progress.cards[cardKey(direction, id)]
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
}

export function recordAnswer(direction: Direction, id: string, answer: Answer, now = Date.now()): CardState {
  const data = store.get()
  const key = cardKey(direction, id)
  const previous = data.cards[key]
  const card = review(previous, gradeAnswer({ ...answer, isNew: !previous }), now)
  const today = dayKey(now)
  const days = data.days.at(-1) === today ? data.days : [...data.days, today].slice(-MAX_DAYS)
  store.set({ ...data, cards: { ...data.cards, [key]: card }, days })
  return card
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
  return {
    cards,
    days: [...new Set([...current.days, ...incoming.days])].toSorted().slice(-MAX_DAYS),
    bestStreak: Math.max(current.bestStreak, incoming.bestStreak),
    lastDeckId: current.lastDeckId ?? incoming.lastDeckId,
  }
}
