import type { Word } from './types'
import { vocabulary } from './vocabulary'

/** Todo el vocabulario, ordenado de la palabra más usada a la menos usada (ver scripts/rank_words.py). */
export const ALL_WORDS = vocabulary()

export const LEVEL_SIZE = 500

export type DeckKind = 'level' | 'all' | 'review' | 'hard' | 'favorites' | 'coach' | 'topic'

export interface Deck {
  id: string
  /** Nivel, todas las palabras, o un mazo armado con el progreso (repaso del día, difíciles). */
  kind: DeckKind
  /** Número de nivel; `null` en los demás mazos. */
  level: number | null
  name: string
  description: string
  words: readonly Word[]
  /** Orden en que se introducen las palabras nuevas. */
  newOrder: 'frequency' | 'random'
  /** Posición de la primera y la última palabra en el ranking de frecuencia (desde 1). */
  from: number
  to: number
}

const LEVEL_INFO: Array<[name: string, description: string]> = [
  ['Esenciales', 'Las palabras que sostienen cualquier conversación.'],
  ['Básico', 'Lo que oyes a diario en series y canciones.'],
  ['Cotidiano', 'Trabajo, casa, ciudad y rutina.'],
  ['Conversación', 'Para charlar con soltura de casi cualquier tema.'],
  ['Intermedio', 'Para entender noticias y artículos.'],
  ['Intermedio alto', 'Opiniones, matices y temas del mundo.'],
  ['Fluido', 'Para expresarte con precisión y naturalidad.'],
  ['Avanzado', 'Vocabulario de libros y conversaciones profundas.'],
  ['Profesional', 'Trabajo, ciencia, economía y sociedad.'],
  ['Culto', 'Las palabras que distinguen a un buen lector.'],
  ['Experto', 'Menos comunes, pero muy útiles.'],
  ['Especialista', 'Lo que aparece en la prensa, los ensayos y la ley.'],
  ['Erudito', 'Para leer casi cualquier cosa sin diccionario.'],
  ['Refinado', 'Precisión y elegancia al hablar y al escribir.'],
  ['Maestría', 'Vocabulario de hablante culto.'],
  ['Élite', 'Lo que pocos estudiantes llegan a dominar.'],
  ['Leyenda', 'El remate: lo menos frecuente de la lista.'],
]

export const LEVELS: readonly Deck[] = Array.from({ length: Math.ceil(ALL_WORDS.length / LEVEL_SIZE) }, (_, i) => {
  const [name, description] = LEVEL_INFO[i] ?? [`Nivel ${i + 1}`, 'Más vocabulario.']
  const from = i * LEVEL_SIZE
  const deckWords = ALL_WORDS.slice(from, from + LEVEL_SIZE)
  return {
    id: `level-${i + 1}`,
    kind: 'level' as const,
    level: i + 1,
    name,
    description,
    words: deckWords,
    newOrder: 'frequency' as const,
    from: from + 1,
    to: from + deckWords.length,
  }
})

export const ALL_DECK: Deck = {
  id: 'all',
  kind: 'all',
  level: null,
  name: 'Todas las palabras',
  description: 'Mezcladas, de todos los niveles.',
  words: ALL_WORDS,
  newOrder: 'random',
  from: 1,
  to: ALL_WORDS.length,
}

/** La sesión inteligente: todo el vocabulario, y el entrenador decide qué toca (ver coach.ts). */
export const COACH_DECK: Deck = {
  id: 'coach',
  kind: 'coach',
  level: null,
  name: 'Sesión inteligente',
  description: 'Repasos, lo que falta afianzar y palabras nuevas a tu ritmo.',
  words: ALL_WORDS,
  newOrder: 'frequency',
  from: 1,
  to: ALL_WORDS.length,
}

/** Unas cuantas palabras repartidas por el mazo, para dar una idea de su dificultad. */
export function samplePreview(deck: Deck, count = 4): Word[] {
  return Array.from({ length: count }, (_, i) => deck.words[Math.floor(((i + 0.5) / count) * deck.words.length)])
}

/** Tamaño del entorno de frecuencia del que salen los distractores en mazos de más de un nivel. */
export const DISTRACTOR_WINDOW = LEVEL_SIZE

const rankOf = new Map(ALL_WORDS.map((word, index) => [word.id, index]))

/** Posición de una palabra en la lista de frecuencia (desde 1): «la palabra nº 313». */
export const wordNumber = (id: string) => (rankOf.get(id) ?? 0) + 1

/** El nivel que sigue a otro, para continuar el recorrido en orden; null tras el último. */
export const nextLevel = (deck: Deck): Deck | null => (deck.level === null ? null : (LEVELS[deck.level] ?? null))

/**
 * Palabras de las que salen los distractores de `word`. En un nivel, el propio nivel (todas son de
 * frecuencia parecida). En los demás mazos (todas, repaso del día, difíciles), las del vocabulario
 * de frecuencia cercana a la respuesta: si no, una palabra avanzada competiría con "the" y se
 * adivinaría por descarte, y un mazo pequeño repetiría siempre las mismas opciones.
 */
/** Con al menos estas palabras, una colección temática saca los distractores de sí misma. */
const TOPIC_POOL_MIN = 12

export function distractorPool(deck: Deck, word: Word): readonly Word[] {
  if (deck.kind === 'level') return deck.words
  // En una colección, las opciones son del mismo tema (todas comidas, todos animales): exige
  // saber la palabra exacta, no solo el campo.
  if (deck.kind === 'topic' && deck.words.length >= TOPIC_POOL_MIN) return deck.words
  const rank = rankOf.get(word.id) ?? 0
  const start = Math.max(0, Math.min(rank - DISTRACTOR_WINDOW / 2, ALL_WORDS.length - DISTRACTOR_WINDOW))
  return ALL_WORDS.slice(start, start + DISTRACTOR_WINDOW)
}
