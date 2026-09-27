import { PARTS_OF_SPEECH, type PartOfSpeech, type Word } from './types'

interface RawWord {
  id: string
  en: string
  es: string
  pos: string
}

const isPartOfSpeech = (value: string): value is PartOfSpeech => (PARTS_OF_SPEECH as readonly string[]).includes(value)

/**
 * Convierte el vocabulario de words.json al tipo Word. JSON solo sabe que `pos` es un texto: una
 * categoría desconocida es un error en los datos y se detiene aquí (los tests lo detectan antes).
 */
export function parseWords(raw: readonly RawWord[]): readonly Word[] {
  return raw.map((word) => {
    if (!isPartOfSpeech(word.pos)) throw new Error(`Categoría gramatical desconocida en "${word.id}": ${word.pos}`)
    return { id: word.id, en: word.en, es: word.es, pos: word.pos }
  })
}
