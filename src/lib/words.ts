import { PARTS_OF_SPEECH, type PartOfSpeech, type Word } from './types'
import { isRecord } from './validate'

const isPartOfSpeech = (value: string): value is PartOfSpeech => (PARTS_OF_SPEECH as readonly string[]).includes(value)

/**
 * Decodifica el vocabulario compacto que descarga la app (ver vite/vocabulary.ts): columnas de
 * palabras inglesas y traducciones, categorías como dígitos y los pocos ids distintos de su palabra.
 * Llega por red, así que se valida: columnas de distinto largo o una categoría fuera de rango son
 * un error de publicación.
 */
export function parseCompactVocabulary(raw: unknown): readonly Word[] {
  if (!isRecord(raw)) throw new Error('El vocabulario no tiene el formato esperado')
  const { en, es, pos, ids } = raw
  if (typeof en !== 'string' || typeof es !== 'string' || typeof pos !== 'string' || !isRecord(ids)) {
    throw new Error('El vocabulario está incompleto')
  }
  const english = en.split('\n')
  const spanish = es.split('\n')
  if (spanish.length !== english.length || pos.length !== english.length) {
    throw new Error('Las columnas del vocabulario no coinciden')
  }
  return english.map((word, index) => {
    const category = PARTS_OF_SPEECH[Number(pos[index])]
    if (!category) throw new Error(`Categoría desconocida en la palabra ${index}`)
    const id = ids[index]
    return { id: typeof id === 'string' ? id : word, en: word, es: spanish[index], pos: category }
  })
}

/**
 * Convierte el vocabulario de words.json al tipo Word. Llega por red, así que se valida entero: un
 * dato mal formado es un error de publicación y se detiene aquí (los tests lo detectan antes).
 */
export function parseWords(raw: unknown): readonly Word[] {
  if (!Array.isArray(raw)) throw new Error('El vocabulario no es una lista')
  return raw.map((word: unknown, index) => {
    if (!isRecord(word)) throw new Error(`Palabra ${index} mal formada`)
    const { id, en, es, pos } = word
    if (typeof id !== 'string' || typeof en !== 'string' || typeof es !== 'string' || typeof pos !== 'string') {
      throw new Error(`Palabra ${index} incompleta`)
    }
    if (!isPartOfSpeech(pos)) throw new Error(`Categoría gramatical desconocida en "${id}": ${pos}`)
    return { id, en, es, pos }
  })
}
