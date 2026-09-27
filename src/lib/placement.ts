/**
 * Prueba de nivel del primer uso: unas pocas palabras de cada nivel, de más frecuente a menos. Se
 * detiene en el primer nivel que no se supera y recomienda empezar por él. Las palabras acertadas
 * se marcan como sabidas: no hace falta que el repaso espaciado las vuelva a presentar como nuevas.
 */
import { type Deck, LEVELS } from './decks'
import { buildOptions } from './quiz'
import type { Rng, Word } from './types'

/** Palabras por nivel. */
export const WORDS_PER_LEVEL = 3
/** Aciertos necesarios para superar un nivel. */
export const PASS_MARK = 2

/** Palabras de contenido: con un artículo o una preposición se adivina demasiado. */
const CONTENT = new Set(['noun', 'verb', 'adj', 'adv'])

export interface PlacementItem {
  level: number
  word: Word
  options: Word[]
}

/**
 * Las palabras de prueba de un nivel, repartidas por su tramo de frecuencia (al principio, a la
 * mitad y al final), siempre las mismas para que la prueba sea comparable.
 */
export function placementItems(deck: Deck, rng: Rng = Math.random): PlacementItem[] {
  const content = deck.words.filter((word) => CONTENT.has(word.pos))
  return Array.from({ length: WORDS_PER_LEVEL }, (_, i) => {
    const word = content[Math.floor(((i + 0.5) / WORDS_PER_LEVEL) * content.length)]
    return { level: deck.level ?? 0, word, options: buildOptions(word, deck.words, undefined, rng) }
  })
}

export interface PlacementState {
  /** Nivel que se está probando (índice en LEVELS). */
  levelIndex: number
  items: PlacementItem[]
  /** Posición dentro de las palabras del nivel. */
  step: number
  /** Aciertos en el nivel actual. */
  correct: number
  /** Palabras acertadas en toda la prueba. */
  known: Word[]
  /** Nivel recomendado al terminar (null mientras sigue). */
  result: number | null
}

export function startPlacement(rng: Rng = Math.random): PlacementState {
  return { levelIndex: 0, items: placementItems(LEVELS[0], rng), step: 0, correct: 0, known: [], result: null }
}

/**
 * Registra la respuesta (`null` = "no la sé") y pasa a la siguiente palabra, al siguiente nivel o al
 * resultado. Un nivel se supera con PASS_MARK aciertos de WORDS_PER_LEVEL; en cuanto ya no se puede
 * superar, la prueba termina y recomienda ese nivel.
 */
export function answerPlacement(
  state: PlacementState,
  answerId: string | null,
  rng: Rng = Math.random,
): PlacementState {
  if (state.result !== null) return state
  const item = state.items[state.step]
  const right = answerId === item.word.id
  const correct = state.correct + (right ? 1 : 0)
  const known = right ? [...state.known, item.word] : state.known
  const step = state.step + 1
  const remaining = WORDS_PER_LEVEL - step
  const level = LEVELS[state.levelIndex].level ?? 1

  if (correct + remaining < PASS_MARK) return { ...state, step, correct, known, result: level }
  if (step < WORDS_PER_LEVEL) return { ...state, step, correct, known }

  // Nivel superado: al siguiente, o el último si se superaron todos.
  const next = state.levelIndex + 1
  if (next >= LEVELS.length) return { ...state, step, correct, known, result: level }
  return { levelIndex: next, items: placementItems(LEVELS[next], rng), step: 0, correct: 0, known, result: null }
}

/** Progreso de la prueba (0–1), para la barra. */
export function placementProgress(state: PlacementState): number {
  if (state.result !== null) return 1
  return (state.levelIndex * WORDS_PER_LEVEL + state.step) / (LEVELS.length * WORDS_PER_LEVEL)
}
