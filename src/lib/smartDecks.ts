/**
 * Mazos que se arman con el progreso del usuario: el repaso del día (todo lo que toca repasar hoy,
 * de todos los niveles) y "Mis difíciles" (lo que más se olvida). También la previsión de repasos.
 */
import { ALL_WORDS, type Deck } from './decks'
import { cardKey, type ProgressData } from './progress'
import type { CardState } from './scheduler'
import type { Track, Word } from './types'

export type SmartDeckKind = 'review' | 'hard'

/** Olvidos a partir de los cuales una palabra cuenta como difícil. */
export const HARD_LAPSES = 2
/** Dificultad FSRS (1–10) a partir de la cual una palabra cuenta como difícil. */
export const HARD_DIFFICULTY = 8

export function endOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

function cardsOf(progress: ProgressData, track: Track): Array<{ word: Word; card: CardState }> {
  const out: Array<{ word: Word; card: CardState }> = []
  for (const word of ALL_WORDS) {
    const card = progress.cards[cardKey(track, word.id)]
    if (card) out.push({ word, card })
  }
  return out
}

export const isHard = (card: CardState) => card.lapses >= HARD_LAPSES || card.difficulty >= HARD_DIFFICULTY

/** Palabras que tocan hoy (vencidas o que vencen antes de medianoche), las más atrasadas primero. */
export function dueToday(progress: ProgressData, track: Track, now: number): Word[] {
  const limit = endOfDay(now)
  return cardsOf(progress, track)
    .filter(({ card }) => card.due <= limit)
    .toSorted((a, b) => a.card.due - b.card.due)
    .map(({ word }) => word)
}

/** Las que más cuestan: olvidadas varias veces o con dificultad alta; las más olvidadas primero. */
export function hardWords(progress: ProgressData, track: Track): Word[] {
  return cardsOf(progress, track)
    .filter(({ card }) => isHard(card))
    .toSorted((a, b) => b.card.lapses - a.card.lapses || b.card.difficulty - a.card.difficulty)
    .map(({ word }) => word)
}

/**
 * Repasos de los próximos `days` días: el índice 0 es hoy (incluye lo atrasado), el 1 mañana…
 * Cuenta por días del calendario local.
 */
export function forecast(progress: ProgressData, track: Track, now: number, days = 7): number[] {
  const counts = Array.from({ length: days }, () => 0)
  const ends = counts.map((_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    return endOfDay(d.getTime())
  })
  for (const { card } of cardsOf(progress, track)) {
    const index = ends.findIndex((end) => card.due <= end)
    if (index >= 0) counts[index]++
  }
  return counts
}

const SMART_INFO: Record<SmartDeckKind, { name: string; description: string }> = {
  review: { name: 'Repaso del día', description: 'Todo lo que toca repasar hoy, de todos los niveles.' },
  hard: { name: 'Mis difíciles', description: 'Las palabras que más se te olvidan.' },
}

/** Arma el mazo con las palabras de este momento: no cambia mientras se juega. */
export function buildSmartDeck(kind: SmartDeckKind, progress: ProgressData, track: Track, now: number): Deck {
  const words = kind === 'review' ? dueToday(progress, track, now) : hardWords(progress, track)
  return {
    id: kind,
    kind,
    level: null,
    ...SMART_INFO[kind],
    words,
    newOrder: 'random',
    from: 1,
    to: words.length,
  }
}
