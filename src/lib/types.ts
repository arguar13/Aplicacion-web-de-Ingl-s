import type { PickReason } from './scheduler'

/** Una entrada del vocabulario. `id` también es el nombre del archivo de audio. */
export interface Word {
  id: string
  en: string
  es: string
}

/** Una ronda: la palabra a adivinar, por qué salió y las teclas que se muestran. */
export interface Round {
  word: Word
  reason: PickReason
  options: Word[]
}

export type Rng = () => number
