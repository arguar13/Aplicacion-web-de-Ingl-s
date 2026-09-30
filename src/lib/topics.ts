/** Palabras de cada colección temática y su mazo para practicar (ver topicMeta.ts). */
import data from '@/data/topics.json'
import { ALL_WORDS, type Deck } from './decks'
import { topicInfo, type TopicId } from './topicMeta'
import type { Word } from './types'

const byId = new Map(ALL_WORDS.map((word) => [word.id, word]))

/** Palabras del tema, en orden de frecuencia (las que ya no estén en el vocabulario se ignoran). */
export function topicWords(id: TopicId): Word[] {
  return data[id].flatMap((wordId) => {
    const word = byId.get(wordId)
    return word ? [word] : []
  })
}

export function topicDeck(id: TopicId): Deck {
  const words = topicWords(id)
  const { name, description } = topicInfo(id)
  return {
    id: `tema-${id}`,
    kind: 'topic',
    level: null,
    name,
    description,
    words,
    newOrder: 'frequency',
    from: 1,
    to: words.length,
  }
}
