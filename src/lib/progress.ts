/** Progreso del usuario: estado de cada palabra, días practicados y récord. */
import { type CardState, review } from './scheduler'
import { createPersistedStore, isRecord, useStore } from './store'
import type { Direction } from './types'

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

const EMPTY: ProgressData = { cards: {}, days: [], bestStreak: 0, lastDeckId: null }

const store = createPersistedStore<ProgressData>('tecla:progress:v1', EMPTY, (raw) =>
  isRecord(raw) && isRecord(raw.cards) ? { ...EMPTY, ...(raw as Partial<ProgressData>) } : EMPTY,
)

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

export function recordAnswer(direction: Direction, id: string, clean: boolean, now = Date.now()): CardState {
  const data = store.get()
  const key = cardKey(direction, id)
  const card = review(data.cards[key], clean, now)
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
