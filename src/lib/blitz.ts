/**
 * Relámpago: 60 segundos para acertar tantas palabras ya vistas como se pueda. Es un juego, no un
 * repaso: no cambia el calendario del repaso espaciado (la prisa haría fallar lo que sí se sabe),
 * pero cuenta como práctica del día.
 */
import { ALL_WORDS } from './decks'
import { cardKey, type ProgressData } from './progress'
import { buildOptions, shuffle } from './quiz'
import type { Rng, Word } from './types'

export const BLITZ_SECONDS = 60
/** Palabras vistas necesarias para que el juego tenga variedad. */
export const BLITZ_MIN_WORDS = 12

/** Palabras ya vistas en traducir (inglés → español), que es lo que se juega. */
export function blitzPool(progress: ProgressData): Word[] {
  return ALL_WORDS.filter((word) => progress.cards[cardKey('en-es', word.id)])
}

export interface BlitzRound {
  word: Word
  options: Word[]
}

/**
 * Una baraja de rondas sin repetir palabra hasta agotarlas. Los distractores salen de las mismas
 * palabras vistas: así ninguna opción es desconocida y se decide por lo que se sabe.
 */
export function blitzDeck(pool: readonly Word[], rng: Rng = Math.random): () => BlitzRound {
  let queue: Word[] = []
  return () => {
    if (queue.length === 0) queue = shuffle(pool, rng)
    const word = queue.pop() ?? pool[0]
    return { word, options: buildOptions(word, pool, undefined, rng) }
  }
}
