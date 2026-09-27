import { useMemo } from 'react'
import { ALL_DECK, type Deck, LEVELS } from '@/lib/decks'
import { cardLookup, useProgress } from '@/lib/progress'
import { type DeckSummary, summarize } from '@/lib/scheduler'
import type { Direction } from '@/lib/types'
import { useNow } from './useNow'

const KNOWN_DECKS: readonly Deck[] = [...LEVELS, ALL_DECK]

/**
 * Resumen de cada mazo (nuevas, aprendiendo, dominadas, por repasar) para un sentido.
 *
 * Se calcula una vez por cambio de progreso, de sentido o de minuto, no en cada render. Un mazo
 * que no está entre los fijos (p. ej. uno generado al vuelo) se resume al pedirlo.
 */
export function useDeckSummaries(direction: Direction): (deck: Deck) => DeckSummary {
  const progress = useProgress()
  const now = useNow()
  return useMemo(() => {
    const lookup = cardLookup(progress, direction)
    const known = new Map(KNOWN_DECKS.map((deck) => [deck.id, summarize(deck.words, lookup, now)]))
    return (deck: Deck) => known.get(deck.id) ?? summarize(deck.words, lookup, now)
  }, [progress, direction, now])
}
