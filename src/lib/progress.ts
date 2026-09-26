/**
 * Progreso del usuario guardado en el dispositivo (localStorage).
 *
 * Es un almacén externo a React: los componentes se suscriben con useProgress() y se actualizan
 * solos, también cuando otra pestaña cambia el progreso. Si el navegador no deja guardar (modo
 * privado, almacenamiento lleno), la app sigue funcionando en memoria.
 */
import { useSyncExternalStore } from 'react'
import { type CardState, review } from './scheduler'

const STORAGE_KEY = 'tecla:progress:v1'
/** Días de práctica que se conservan para calcular la racha. */
const MAX_DAYS = 400

/** Sentido de la pregunta: palabra en inglés → traducción, o al revés. */
export type Direction = 'en-es' | 'es-en'

export interface ProgressData {
  /** Estado de cada palabra, con clave `${direction}:${wordId}`. */
  cards: Record<string, CardState>
  /** Días con práctica, en formato AAAA-MM-DD y hora local, de más antiguo a más reciente. */
  days: string[]
  bestStreak: number
  lastDeckId: string | null
}

const EMPTY: ProgressData = { cards: {}, days: [], bestStreak: 0, lastDeckId: null }

function read(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('cards' in parsed)) return EMPTY
    return { ...EMPTY, ...(parsed as Partial<ProgressData>) }
  } catch {
    return EMPTY
  }
}

let data: ProgressData = typeof window === 'undefined' ? EMPTY : read()
const listeners = new Set<() => void>()

function commit(next: ProgressData) {
  data = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Sin almacenamiento disponible: el progreso dura lo que dure la pestaña.
  }
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    data = read()
    for (const listener of listeners) listener()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProgress(): ProgressData {
  return useSyncExternalStore(subscribe, () => data, () => EMPTY)
}

export function getProgress(): ProgressData {
  return data
}

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
  const key = cardKey(direction, id)
  const card = review(data.cards[key], clean, now)
  const today = dayKey(now)
  const days = data.days.at(-1) === today ? data.days : [...data.days, today].slice(-MAX_DAYS)
  commit({ ...data, cards: { ...data.cards, [key]: card }, days })
  return card
}

export function recordStreak(streak: number) {
  if (streak > data.bestStreak) commit({ ...data, bestStreak: streak })
}

export function setLastDeck(deckId: string) {
  if (data.lastDeckId !== deckId) commit({ ...data, lastDeckId: deckId })
}

export function resetProgress() {
  commit(EMPTY)
}
