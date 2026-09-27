import { describe, expect, it } from 'vitest'
import { ALL_DECK, ALL_WORDS, DISTRACTOR_WINDOW, distractorPool, LEVEL_SIZE, LEVELS, samplePreview } from './decks'

describe('niveles', () => {
  it('cubren todas las palabras, en orden y sin solaparse', () => {
    expect(LEVELS.flatMap((d) => d.words)).toEqual(ALL_WORDS)
    expect(LEVELS.every((d) => d.words.length > 0 && d.words.length <= LEVEL_SIZE)).toBe(true)
    expect(LEVELS.at(-1)!.to).toBe(ALL_WORDS.length)
  })

  it('el nivel 1 empieza por las palabras más frecuentes', () => {
    const first = LEVELS[0].words.slice(0, 20).map((w) => w.id)
    expect(first).toEqual(
      expect.arrayContaining(['the', 'and', 'of', 'to'].filter((id) => ALL_WORDS.some((w) => w.id === id))),
    )
  })

  it('el mazo completo tiene todo el vocabulario', () => {
    expect(ALL_DECK.words).toHaveLength(ALL_WORDS.length)
  })

  it('la vista previa devuelve palabras reales del mazo', () => {
    for (const deck of [...LEVELS, ALL_DECK]) {
      const preview = samplePreview(deck)
      expect(preview).toHaveLength(4)
      expect(preview.every((w) => deck.words.includes(w))).toBe(true)
    }
  })
})

const rank = (id: string) => ALL_WORDS.findIndex((w) => w.id === id)

describe('distractores de dificultad parecida', () => {
  it('en un nivel salen del propio nivel', () => {
    expect(distractorPool(LEVELS[2], LEVELS[2].words[10])).toBe(LEVELS[2].words)
  })

  it('en el mazo completo salen de palabras de frecuencia cercana', () => {
    for (const index of [0, 1234, 2500, ALL_WORDS.length - 1]) {
      const word = ALL_WORDS[index]
      const pool = distractorPool(ALL_DECK, word)
      expect(pool).toHaveLength(DISTRACTOR_WINDOW)
      expect(pool).toContain(word)
      expect(pool.every((w) => Math.abs(rank(w.id) - index) <= DISTRACTOR_WINDOW)).toBe(true)
    }
  })
})
