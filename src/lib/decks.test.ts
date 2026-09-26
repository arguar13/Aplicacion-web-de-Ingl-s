import { describe, expect, it } from 'vitest'
import { ALL_DECK, ALL_WORDS, LEVEL_SIZE, LEVELS, samplePreview } from './decks'

describe('niveles', () => {
  it('cubren todas las palabras, en orden y sin solaparse', () => {
    expect(LEVELS.flatMap((d) => d.words)).toEqual(ALL_WORDS)
    expect(LEVELS.every((d) => d.words.length > 0 && d.words.length <= LEVEL_SIZE)).toBe(true)
    expect(LEVELS.at(-1)!.to).toBe(ALL_WORDS.length)
  })

  it('el nivel 1 empieza por las palabras más frecuentes', () => {
    const first = LEVELS[0].words.slice(0, 20).map((w) => w.id)
    expect(first).toEqual(expect.arrayContaining(['the', 'and', 'of', 'to'].filter((id) => ALL_WORDS.some((w) => w.id === id))))
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
