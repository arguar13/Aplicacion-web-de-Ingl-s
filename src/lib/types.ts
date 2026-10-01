import type { PickReason } from './scheduler'

export const PARTS_OF_SPEECH = ['noun', 'verb', 'adj', 'adv', 'pron', 'det', 'prep', 'conj', 'num', 'interj'] as const

/** Categoría gramatical de la traducción (ver scripts/tag_pos.py). */
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number]

/** Palabras de contenido: con un artículo o una preposición se adivina demasiado (o se aprende poco). */
export const CONTENT_POS: ReadonlySet<PartOfSpeech> = new Set(['noun', 'verb', 'adj', 'adv'])

/** Una entrada del vocabulario. `id` también es el nombre del archivo de audio. */
export interface Word {
  id: string
  en: string
  es: string
  pos: PartOfSpeech
}

/** Una ronda: la palabra a adivinar, cómo se pregunta, por qué salió y las teclas que se muestran. */
export interface Round {
  word: Word
  /** En la sesión inteligente cada ronda tiene su modo; en los demás mazos, el elegido. */
  mode: Mode
  reason: PickReason
  options: Word[]
  /** El entrenador confía en que, si se acierta al instante, ya se sabía (ver gradeAnswer). */
  trusted?: boolean
}

export type Rng = () => number

/**
 * Cómo se practica: traducir (inglés → español), inverso (español → inglés), escuchar (suena la
 * palabra sin mostrarla), escribir (se escribe la palabra inglesa), completar una frase, tarjetas
 * (se piensa la traducción, se muestra y uno mismo se califica) o dictado (se oye y se escribe).
 */
export type Mode = 'en-es' | 'es-en' | 'listen' | 'type' | 'cloze' | 'flash' | 'dictation'
export const MODES: readonly Mode[] = ['en-es', 'es-en', 'listen', 'type', 'cloze', 'flash', 'dictation']

/**
 * Habilidad con progreso propio: cada una tiene sus tarjetas (`${track}:${wordId}`). Completar una
 * frase y las tarjetas refuerzan la comprensión del inglés, así que comparten progreso con
 * traducir; el dictado se escribe en inglés, así que comparte progreso con escribir.
 */
export type Track = 'en-es' | 'es-en' | 'listen' | 'type'
export const TRACKS: readonly Track[] = ['en-es', 'es-en', 'listen', 'type']

const TRACK_OF: Record<Mode, Track> = {
  'en-es': 'en-es',
  'es-en': 'es-en',
  listen: 'listen',
  type: 'type',
  cloze: 'en-es',
  flash: 'en-es',
  dictation: 'type',
}
export const trackOf = (mode: Mode): Track => TRACK_OF[mode]

/** Modos en que la respuesta se escribe (no hay teclas de opciones). */
export const isTypedMode = (mode: Mode) => mode === 'type' || mode === 'dictation'

/** Idioma de la respuesta: lo que se elige en las teclas, se muestra en la tarjeta o se escribe. */
export const answerLanguage = (mode: Mode): 'es' | 'en' =>
  mode === 'en-es' || mode === 'listen' || mode === 'flash' ? 'es' : 'en'
