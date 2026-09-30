import { describe, expect, it } from 'vitest'
import words from '../src/data/words.json'
import { PARTS_OF_SPEECH } from '../src/lib/types'
import { parseCompactVocabulary, parseWords } from '../src/lib/words'
import { compactVocabulary, parseSource, POS_ORDER } from './vocabulary'

describe('vocabulario compacto', () => {
  it('las categorías siguen el mismo orden en el build y en la app', () => {
    expect([...POS_ORDER]).toEqual([...PARTS_OF_SPEECH])
  })

  it('ida y vuelta sin pérdidas: la app ve exactamente words.json', () => {
    const compact = JSON.parse(JSON.stringify(compactVocabulary(parseSource(words)))) as unknown
    expect(parseCompactVocabulary(compact)).toEqual(parseWords(words))
  })

  it('pesa bastante menos que words.json', () => {
    expect(JSON.stringify(compactVocabulary(parseSource(words))).length).toBeLessThan(
      JSON.stringify(words).length * 0.5,
    )
  })

  it('rechaza columnas que no coinciden o categorías fuera de rango', () => {
    expect(() => parseCompactVocabulary({ en: 'a\nb', es: 'x', pos: '00', ids: {} })).toThrow('no coinciden')
    expect(() => parseCompactVocabulary({ en: 'a', es: 'x', pos: '9', ids: {} })).not.toThrow()
    expect(() => parseCompactVocabulary({ en: 'a', es: 'x', pos: 'z', ids: {} })).toThrow('Categoría')
    expect(() => parseCompactVocabulary(null)).toThrow('formato')
  })
})
