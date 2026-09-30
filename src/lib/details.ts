/**
 * Detalles de cada palabra: pronunciación (IPA), formas irregulares y frase de ejemplo.
 *
 * Viven en src/data/details.json (lo genera scripts/enrich_words.py) y se cargan aparte, en su
 * propio chunk: la primera ronda no espera por ellos y el service worker los guarda para usarlos
 * sin conexión.
 */
import detailsUrl from '@/data/details.json?url'
import { useSyncExternalStore } from 'react'
import { isRecord } from './validate'

export type FormName = 'past' | 'participle' | 'past-participle' | 'gerund' | 'third-person' | 'present' | 'plural'

export interface WordDetails {
  ipa?: string
  /** Formas irregulares de esta palabra. */
  forms?: { past: string; participle: string } | { plural: string }
  /** Si la palabra es una forma de otra ("went" es el pasado de "go"). */
  of?: { lemma: string; form: FormName }
  example?: { en: string; es: string }
}

export type DetailsMap = ReadonlyMap<string, WordDetails>

const FORM_NAMES: readonly FormName[] = [
  'past',
  'participle',
  'past-participle',
  'gerund',
  'third-person',
  'present',
  'plural',
]

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const isFormName = (value: unknown): value is FormName => FORM_NAMES.some((name) => name === value)

function parseEntry(raw: unknown): WordDetails {
  if (!isRecord(raw)) return {}
  const details: WordDetails = {}
  if (isString(raw.ipa)) details.ipa = raw.ipa
  const { forms, of, example } = raw
  if (isRecord(forms)) {
    if (isString(forms.past) && isString(forms.participle)) {
      details.forms = { past: forms.past, participle: forms.participle }
    } else if (isString(forms.plural)) {
      details.forms = { plural: forms.plural }
    }
  }
  if (isRecord(of) && isString(of.lemma) && isFormName(of.form)) details.of = { lemma: of.lemma, form: of.form }
  if (isRecord(example) && isString(example.en) && isString(example.es)) {
    details.example = { en: example.en, es: example.es }
  }
  return details
}

/** Valida el archivo de detalles; una entrada dañada se queda vacía sin afectar al resto. */
export function parseDetails(raw: unknown): DetailsMap {
  if (!isRecord(raw)) return new Map()
  return new Map(Object.entries(raw).map(([id, entry]) => [id, parseEntry(entry)]))
}

let details: DetailsMap | null = null
let loading: Promise<DetailsMap> | null = null
const listeners = new Set<() => void>()

/**
 * Empieza a cargar los detalles (una sola vez) y avisa a quien los espera. Van como JSON aparte y
 * no como módulo JavaScript: con 8000 palabras pesan más de 1 MB, y el navegador lee un JSON mucho
 * más rápido que el mismo contenido escrito como código. Si falla la red, se reintenta en la
 * próxima petición en vez de quedar sin detalles para siempre.
 */
export function loadDetails(): Promise<DetailsMap> {
  loading ??= fetch(detailsUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`No se pudieron cargar los detalles (HTTP ${response.status})`)
      return response.json() as Promise<unknown>
    })
    .then((raw) => {
      details = parseDetails(raw)
      for (const listener of listeners) listener()
      return details
    })
    .catch((error: unknown) => {
      loading = null
      throw error
    })
  return loading
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Detalles de una palabra; `null` mientras cargan. Pedirlos empieza la carga. */
export function useWordDetails(id: string): WordDetails | null {
  const map = useSyncExternalStore(
    subscribe,
    () => details,
    () => null,
  )
  if (!map) {
    // Sin conexión ni caché, la palabra se muestra sin detalles; la próxima vez se reintenta.
    loadDetails().catch(() => undefined)
    return null
  }
  return map.get(id) ?? {}
}

// --- Textos -------------------------------------------------------------------------------------

export const POS_LABEL = {
  noun: 'sustantivo',
  verb: 'verbo',
  adj: 'adjetivo',
  adv: 'adverbio',
  pron: 'pronombre',
  det: 'determinante',
  prep: 'preposición',
  conj: 'conjunción',
  num: 'número',
  interj: 'interjección',
} as const

const FORM_LABEL: Record<FormName, string> = {
  past: 'Pasado',
  participle: 'Participio',
  'past-participle': 'Pasado y participio',
  gerund: 'Forma en -ing',
  'third-person': 'Tercera persona',
  present: 'Presente',
  plural: 'Plural',
}

/** Líneas sobre la forma: "Pasado de go", "Pasado: went · Participio: gone", "Plural: children". */
export function formsText(entry: WordDetails): string | null {
  if (entry.of) return `${FORM_LABEL[entry.of.form]} de ${entry.of.lemma}`
  if (!entry.forms) return null
  if ('plural' in entry.forms) return `Plural: ${entry.forms.plural}`
  const { past, participle } = entry.forms
  return past === participle ? `Pasado y participio: ${past}` : `Pasado: ${past} · Participio: ${participle}`
}

/** Parte la frase para resaltar la palabra: ["Their ", "love", " grew…"]. */
export function splitAround(sentence: string, word: string): [before: string, match: string, after: string] | null {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'i').exec(sentence)
  if (!match) return null
  return [sentence.slice(0, match.index), match[0], sentence.slice(match.index + match[0].length)]
}
