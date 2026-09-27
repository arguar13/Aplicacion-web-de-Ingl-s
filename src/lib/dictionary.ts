/** Búsqueda y filtros del diccionario personal. */
import { ALL_WORDS, LEVEL_SIZE } from './decks'
import { cardKey, type ProgressData } from './progress'
import { normalize, senses } from './quiz'
import { statusOf } from './scheduler'
import { isHard } from './smartDecks'
import type { PartOfSpeech, Track, Word } from './types'

export type StatusFilter = 'all' | 'new' | 'learning' | 'mastered' | 'hard' | 'favorite'

export interface DictionaryFilters {
  query: string
  status: StatusFilter
  /** Nivel 1–8, o null para todos. */
  level: number | null
  pos: PartOfSpeech | null
}

interface IndexedWord {
  word: Word
  rank: number
  en: string
  /** Cada sentido de la traducción, normalizado ("a, para" → ["a", "para"]). */
  es: string[]
  esFull: string
}

/** Índice normalizado, calculado una vez: cada búsqueda solo compara textos ya preparados. */
const INDEX: IndexedWord[] = ALL_WORDS.map((word, rank) => ({
  word,
  rank,
  en: normalize(word.en),
  es: senses(word.es),
  esFull: normalize(word.es),
}))

/**
 * Cuánto encaja una palabra con la búsqueda (menor = mejor): exacta, empieza por, contiene, o no
 * encaja (null). Busca en inglés y en español, sin tildes ni mayúsculas.
 */
function matchScore(entry: IndexedWord, query: string): number | null {
  if (entry.en === query || entry.es.includes(query)) return 0
  if (entry.en.startsWith(query) || entry.es.some((sense) => sense.startsWith(query))) return 1
  if (entry.en.includes(query) || entry.esFull.includes(query)) return 2
  return null
}

export function searchWords(filters: DictionaryFilters, progress: ProgressData, track: Track): Word[] {
  const query = normalize(filters.query)
  const favorites = new Set(progress.favorites)
  const passes = (entry: IndexedWord) => {
    const { word, rank } = entry
    if (filters.level !== null && Math.floor(rank / LEVEL_SIZE) + 1 !== filters.level) return false
    if (filters.pos !== null && word.pos !== filters.pos) return false
    if (filters.status === 'all') return true
    if (filters.status === 'favorite') return favorites.has(word.id)
    const card = progress.cards[cardKey(track, word.id)]
    if (filters.status === 'hard') return card !== undefined && isHard(card)
    const status = statusOf(card)
    return filters.status === 'new' ? status === 'new' : status === filters.status
  }

  if (!query) return INDEX.filter(passes).map((entry) => entry.word)

  const matches: Array<{ word: Word; score: number; rank: number }> = []
  for (const entry of INDEX) {
    const score = matchScore(entry, query)
    if (score !== null && passes(entry)) matches.push({ word: entry.word, score, rank: entry.rank })
  }
  return matches.toSorted((a, b) => a.score - b.score || a.rank - b.rank).map((m) => m.word)
}
