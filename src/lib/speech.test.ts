import { describe, expect, it } from 'vitest'
import { matchesSpoken } from './speech'

describe('pronunciar con la voz', () => {
  it('acepta la palabra dicha, sola o dentro de una frase, sin importar mayúsculas', () => {
    expect(matchesSpoken('water', ['Water'])).toBe(true)
    expect(matchesSpoken('water', ['the water'])).toBe(true)
    expect(matchesSpoken('water', ['what her', 'water.'])).toBe(true)
  })

  it('tolera un error del reconocedor en palabras largas, no en cortas', () => {
    expect(matchesSpoken('breakfast', ['brekfast'])).toBe(true)
    expect(matchesSpoken('cat', ['cut'])).toBe(false)
  })

  it('rechaza otra palabra', () => {
    expect(matchesSpoken('water', ['wander', 'winter'])).toBe(false)
    expect(matchesSpoken('water', [])).toBe(false)
  })
})
