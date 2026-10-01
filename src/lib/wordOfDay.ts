/**
 * Palabra del día: una palabra que aún no se ha visto, un poco más adelante de por donde va el
 * estudiante (ni trivial ni fuera de su alcance). Es la misma durante todo el día y en cualquier
 * dispositivo con el mismo progreso: sale de la fecha, no del azar.
 */
import { ALL_WORDS, LEVEL_SIZE } from './decks'
import { cardKey, type ProgressData } from './progress'
import { daySeed } from './seed'
import { CONTENT_POS, type Word } from './types'

/** Cuántas palabras candidatas se miran a partir de la frontera de aprendizaje. */
const WINDOW = 120

export function wordOfDay(progress: ProgressData, day: string, startLevel = 1): Word {
  const unseen = (word: Word) => !progress.cards[cardKey('en-es', word.id)]
  const start = Math.max(0, (startLevel - 1) * LEVEL_SIZE)
  // La frontera: la primera palabra sin ver desde el nivel de partida.
  let frontier = ALL_WORDS.findIndex((word, rank) => rank >= start && unseen(word))
  if (frontier === -1) frontier = Math.max(0, ALL_WORDS.findIndex(unseen))
  const candidates = ALL_WORDS.slice(frontier, frontier + WINDOW * 3)
    .filter((word) => unseen(word) && CONTENT_POS.has(word.pos))
    .slice(0, WINDOW)
  const pool = candidates.length > 0 ? candidates : ALL_WORDS
  return pool[daySeed(day) % pool.length]
}
