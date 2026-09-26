import words from '@/data/words.json'
import type { Word } from './types'

/** Todo el vocabulario, ordenado de la palabra más usada a la menos usada (ver scripts/rank_words.py). */
export const ALL_WORDS: readonly Word[] = words

export const LEVEL_SIZE = 500

export interface Deck {
  id: string
  /** Número de nivel; `null` para el mazo con todas las palabras. */
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
  ['Intermedio', 'Para entender noticias y artículos.'],
  ['Fluido', 'Matices para expresarte con soltura.'],
  ['Avanzado', 'Vocabulario de libros y conversaciones profundas.'],
  ['Experto', 'Menos comunes, pero muy útiles.'],
  ['Maestría', 'El remate: lo menos frecuente de la lista.'],
]

export const LEVELS: readonly Deck[] = Array.from({ length: Math.ceil(ALL_WORDS.length / LEVEL_SIZE) }, (_, i) => {
  const [name, description] = LEVEL_INFO[i] ?? [`Nivel ${i + 1}`, 'Más vocabulario.']
  const from = i * LEVEL_SIZE
  const deckWords = ALL_WORDS.slice(from, from + LEVEL_SIZE)
  return {
    id: `level-${i + 1}`,
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
  level: null,
  name: 'Todas las palabras',
  description: 'Mezcladas, de todos los niveles.',
  words: ALL_WORDS,
  newOrder: 'random',
  from: 1,
  to: ALL_WORDS.length,
}

/** Unas cuantas palabras repartidas por el mazo, para dar una idea de su dificultad. */
export function samplePreview(deck: Deck, count = 4): Word[] {
  return Array.from({ length: count }, (_, i) => deck.words[Math.floor(((i + 0.5) / count) * deck.words.length)])
}
