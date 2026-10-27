import { describe, expect, it } from 'vitest'
import { alignSpoken, heardWords, normalizeWord, spokenScore, targetWords } from './readAloud'

const align = (sentence: string, transcript: string) => alignSpoken(targetWords(sentence), heardWords(transcript))

describe('leer en voz alta', () => {
  it('separa la frase en palabras comparables, con su puntuación para mostrarlas', () => {
    expect(targetWords('Good morning, Lucy!')).toEqual([
      { text: 'Good', key: 'good' },
      { text: 'morning,', key: 'morning' },
      { text: 'Lucy!', key: 'lucy' },
    ])
    expect(targetWords('A four-day week — finally.').map((word) => word.key)).toEqual([
      'a',
      'four',
      'day',
      'week',
      'finally',
    ])
    expect(normalizeWord('“Café”')).toBe('cafe')
    expect(normalizeWord('I’d')).toBe("i'd")
  })

  it('pasa a palabras los números que escribe el reconocedor', () => {
    expect(heardWords("It's 4 and 27")).toEqual(["it's", 'four', 'and', 'twenty', 'seven'])
    expect(heardWords('at 20')).toEqual(['at', 'twenty'])
  })

  it('marca las palabras dichas aunque sobren o falten otras', () => {
    expect(align('My name is Lucy.', 'my name is lucy')).toEqual([true, true, true, true])
    expect(align('My name is Lucy.', 'um my name lucy')).toEqual([true, true, false, true])
    expect(align('I go to work by bus.', 'I go to the work by bus')).toEqual([true, true, true, true, true, true])
    expect(align('I live in a small house.', '')).toEqual([false, false, false, false, false, false])
  })

  it('tolera un error de una letra en palabras largas, no en las cortas', () => {
    expect(align('The weather is beautiful.', 'the wether is beautifull')).toEqual([true, true, true, true])
    expect(align('I sit here.', 'I set here')).toEqual([true, false, true])
  })

  it('da la nota como proporción de palabras entendidas', () => {
    expect(spokenScore([true, true, false, true])).toBe(0.75)
    expect(spokenScore([])).toBe(0)
  })
})
