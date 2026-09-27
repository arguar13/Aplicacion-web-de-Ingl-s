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

/**
 * Cómo se practica: traducir (inglés → español), inverso (español → inglés), escuchar (suena la
 * palabra sin mostrarla), escribir (se escribe la palabra inglesa) o completar una frase.
 */
export type Mode = 'en-es' | 'es-en' | 'listen' | 'type' | 'cloze'
export const MODES: readonly Mode[] = ['en-es', 'es-en', 'listen', 'type', 'cloze']

/**
 * Habilidad con progreso propio: cada una tiene sus tarjetas (`${track}:${wordId}`). Completar una
 * frase refuerza la comprensión del inglés, así que comparte progreso con traducir.
 */
export type Track = 'en-es' | 'es-en' | 'listen' | 'type'
export const TRACKS: readonly Track[] = ['en-es', 'es-en', 'listen', 'type']

export const trackOf = (mode: Mode): Track => (mode === 'cloze' ? 'en-es' : mode)

/** Idioma de las teclas de respuesta (en escribir no hay teclas: se escribe en inglés). */
export const answerLanguage = (mode: Mode): 'es' | 'en' => (mode === 'en-es' || mode === 'listen' ? 'es' : 'en')
