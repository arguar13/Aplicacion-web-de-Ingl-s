import type { PickReason } from './scheduler'

export const PARTS_OF_SPEECH = ['noun', 'verb', 'adj', 'adv', 'pron', 'det', 'prep', 'conj', 'num', 'interj'] as const

/** Categoría gramatical de la traducción (ver scripts/tag_pos.py). */
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number]

/** Una entrada del vocabulario. `id` también es el nombre del archivo de audio. */
export interface Word {
  id: string
  en: string
  es: string
  pos: PartOfSpeech
}

/** Una ronda: la palabra a adivinar, por qué salió y las teclas que se muestran. */
export interface Round {
  word: Word
  reason: PickReason
  options: Word[]
}

export type Rng = () => number

/** Sentido de la pregunta: palabra en inglés → traducción, o al revés. */
export type Direction = 'en-es' | 'es-en'
