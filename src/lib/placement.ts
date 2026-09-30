/**
 * Prueba de nivel del primer uso: unas pocas palabras por nivel probado, y una búsqueda adaptativa
 * del primer nivel que no se supera. Prueba los niveles 1, 2, 4, 8, 16… hasta el primer fallo y
 * luego afina a medio camino entre el último superado y el primero fallado. Con 17 niveles son
 * como mucho 7 niveles probados (unas 20 palabras), no los 17 uno tras otro; y quien empieza de
 * cero termina en 3 palabras. Las palabras acertadas se marcan como sabidas: no hace falta que el
 * repaso espaciado las presente como nuevas.
 */
import { type Deck, LEVELS } from './decks'
import { buildOptions } from './quiz'
import { CONTENT_POS, type Rng, type Word } from './types'

/** Palabras por nivel. */
export const WORDS_PER_LEVEL = 3
/** Aciertos necesarios para superar un nivel. */
export const PASS_MARK = 2

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
  const content = deck.words.filter((word) => CONTENT_POS.has(word.pos))
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
  /** Nivel más alto superado (0 = ninguno) y más bajo fallado (null = aún ninguno). */
  passed: number
  failed: number | null
  /** Niveles ya probados, para la barra de progreso. */
  probes: number
  /** Nivel recomendado al terminar (null mientras sigue). */
  result: number | null
}

function probe(level: number, state: Omit<PlacementState, 'levelIndex' | 'items' | 'step' | 'correct'>, rng: Rng) {
  return { ...state, levelIndex: level - 1, items: placementItems(LEVELS[level - 1], rng), step: 0, correct: 0 }
}

export function startPlacement(rng: Rng = Math.random): PlacementState {
  return probe(1, { known: [], passed: 0, failed: null, probes: 0, result: null }, rng)
}

/**
 * Registra la respuesta (`null` = "no la sé") y pasa a la siguiente palabra, al siguiente nivel a
 * probar o al resultado. Un nivel se supera con PASS_MARK aciertos de WORDS_PER_LEVEL; en cuanto ya
 * no se puede superar (o ya está superado), no se sigue preguntando por él.
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
  const level = state.levelIndex + 1

  const failedNow = correct + remaining < PASS_MARK
  const passedNow = correct >= PASS_MARK
  if (!failedNow && !passedNow) return { ...state, step, correct, known }

  const passed = passedNow ? level : state.passed
  const failed = failedNow ? level : state.failed
  const probes = state.probes + 1
  const done = { ...state, step, correct, known, passed, failed, probes }
  const last = LEVELS.length
  if (failed !== null && failed - passed <= 1) return { ...done, result: failed }
  if (failed === null && passed === last) return { ...done, result: last }
  // Sin fallos aún, se dobla el nivel (1, 2, 4, 8…); con un fallo, a medio camino.
  const next = failed === null ? Math.min(passed * 2, last) : Math.floor((passed + failed) / 2)
  return probe(next, { known, passed, failed, probes, result: null }, rng)
}

/** Niveles que como mucho se prueban: los que dobla la búsqueda y los que luego afina. */
const MAX_PROBES = 2 * Math.ceil(Math.log2(LEVELS.length)) + 1

/** Progreso de la prueba (0–1), para la barra. Cada nivel probado acerca el resultado. */
export function placementProgress(state: PlacementState): number {
  if (state.result !== null) return 1
  return Math.min(0.95, (state.probes + state.step / WORDS_PER_LEVEL) / MAX_PROBES)
}
