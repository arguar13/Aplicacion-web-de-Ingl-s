/**
 * Plugin de Vite: el vocabulario que descarga la app, en formato compacto.
 *
 * src/data/words.json es la fuente (legible, la editan los scripts y la leen los tests). La app no
 * lo descarga tal cual: con 8000 palabras, las claves repetidas y el id igual a la palabra inglesa
 * son un tercio del peso. Aquí se reescribe por columnas —todas las palabras inglesas, todas las
 * traducciones y las categorías como dígitos, más los pocos ids distintos de su palabra— y se
 * publica como `assets/words-<hash>.json`. src/lib/vocabulary.ts lo decodifica y valida.
 */
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { isRecord } from '../src/lib/validate.ts'

const VIRTUAL_ID = 'virtual:vocabulary-url'
const RESOLVED_ID = `\0${VIRTUAL_ID}`
const DEV_URL = '/@tecla/words.json'

/** Categorías en el orden de src/lib/types.ts (PARTS_OF_SPEECH): cada una es un dígito. */
export const POS_ORDER = ['noun', 'verb', 'adj', 'adv', 'pron', 'det', 'prep', 'conj', 'num', 'interj'] as const

export interface CompactVocabulary {
  /** Palabras inglesas, una por línea, en orden de frecuencia. */
  en: string
  /** Traducciones, una por línea. */
  es: string
  /** Categoría de cada palabra: un dígito (índice en POS_ORDER). */
  pos: string
  /** Posición → id, solo cuando el id no es la palabra inglesa ("I" → "i", "Mr." → "mr"). */
  ids: Record<string, string>
}

interface SourceWord {
  id: string
  en: string
  es: string
  pos: string
}

/** Lee words.json: una lista de palabras con id, en, es y pos (textos). */
export function parseSource(raw: unknown): SourceWord[] {
  if (!Array.isArray(raw)) throw new Error('words.json no es una lista')
  return raw.map((entry: unknown, index) => {
    if (!isRecord(entry)) throw new Error(`Palabra ${index} mal formada`)
    const { id, en, es, pos } = entry
    if (typeof id !== 'string' || typeof en !== 'string' || typeof es !== 'string' || typeof pos !== 'string') {
      throw new Error(`Palabra ${index} incompleta`)
    }
    return { id, en, es, pos }
  })
}

export function compactVocabulary(words: readonly SourceWord[]): CompactVocabulary {
  const ids: Record<string, string> = {}
  for (const [index, word] of words.entries()) {
    if (word.en.includes('\n') || word.es.includes('\n')) throw new Error(`Salto de línea en "${word.id}"`)
    if (word.id !== word.en) ids[index] = word.id
  }
  return {
    en: words.map((word) => word.en).join('\n'),
    es: words.map((word) => word.es).join('\n'),
    pos: words
      .map((word) => {
        const index = (POS_ORDER as readonly string[]).indexOf(word.pos)
        if (index === -1) throw new Error(`Categoría desconocida en "${word.id}": ${word.pos}`)
        return String(index)
      })
      .join(''),
    ids,
  }
}

export function vocabularyAsset(source: string): Plugin {
  const compact = () => {
    const raw: unknown = JSON.parse(readFileSync(source, 'utf8'))
    return JSON.stringify(compactVocabulary(parseSource(raw)))
  }
  return {
    name: 'tecla-vocabulary',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      this.addWatchFile(source)
      if (this.environment.mode === 'dev') return `export default ${JSON.stringify(DEV_URL)}`
      const reference = this.emitFile({ type: 'asset', name: 'words.json', source: compact() })
      return `export default import.meta.ROLLUP_FILE_URL_${reference}`
    },
    configureServer(server) {
      server.middlewares.use(DEV_URL, (_request, response) => {
        response.setHeader('Content-Type', 'application/json')
        response.end(compact())
      })
    },
  }
}
