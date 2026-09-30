import { describe, expect, it } from 'vitest'
import data from '@/data/topics.json'
import { ALL_WORDS, distractorPool } from './decks'
import { parseHash } from './routes'
import { isTopicId, TOPICS } from './topicMeta'
import { topicDeck, topicWords } from './topics'

const ids = new Set(ALL_WORDS.map((word) => word.id))

describe('colecciones temáticas', () => {
  it('cada tema de los datos tiene nombre, y cada nombre tiene datos', () => {
    expect(Object.keys(data).toSorted()).toEqual(TOPICS.map((topic) => topic.id).toSorted())
  })

  it('las palabras de cada tema existen en el vocabulario y no se repiten entre temas', () => {
    const all = Object.values(data).flat()
    expect(all.filter((id) => !ids.has(id))).toEqual([])
    expect(new Set(all).size).toBe(all.length)
  })

  it('ningún tema es tan pequeño que no se pueda practicar', () => {
    const small = TOPICS.filter((topic) => topicWords(topic.id).length < 30).map((topic) => topic.id)
    expect(small).toEqual([])
  })

  it('en una colección, los distractores salen del mismo tema', () => {
    const deck = topicDeck('comida')
    expect(distractorPool(deck, deck.words[0])).toBe(deck.words)
  })

  it('cada tema tiene su ruta, y una desconocida lleva al inicio', () => {
    expect(parseHash('#/tema/animales').screen).toEqual({ name: 'topic', topic: 'animales' })
    expect(parseHash('#/tema/dragones').screen).toEqual({ name: 'home' })
    expect(parseHash('#/colecciones').screen).toEqual({ name: 'topics' })
    expect(isTopicId('ropa')).toBe(true)
  })
})
