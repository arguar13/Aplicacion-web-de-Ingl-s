import { describe, expect, it } from 'vitest'
import details from '@/data/details.json'
import { ALL_WORDS } from './decks'
import { formsText, parseDetails, splitAround } from './details'

const DETAILS = parseDetails(details)

describe('detalles del vocabulario', () => {
  it('cada palabra tiene detalles con su pronunciación', () => {
    expect(ALL_WORDS.filter((w) => !DETAILS.get(w.id)?.ipa).map((w) => w.id)).toEqual([])
    expect([...DETAILS.values()].every((d) => !d.ipa || /^\/.+\/$/.test(d.ipa))).toBe(true)
  })

  it('cada palabra tiene un ejemplo que la contiene, corto y bien puntuado', () => {
    const problems = ALL_WORDS.flatMap((word) => {
      const example = DETAILS.get(word.id)?.example
      if (!example) return [`${word.id}: sin ejemplo`]
      const out: string[] = []
      if (!splitAround(example.en, word.en)) out.push(`${word.id}: el ejemplo no contiene la palabra`)
      const length = example.en.split(/\s+/).length
      if (length < 3 || length > 12) out.push(`${word.id}: ${length} palabras`)
      if (!/^[A-Z¿¡"'0-9]/.test(example.en) || !/[.?!]["']?$/.test(example.en)) out.push(`${word.id}: puntuación`)
      if (!example.es.trim()) out.push(`${word.id}: sin traducción`)
      return out
    })
    expect(problems).toEqual([])
  })

  it('no hay detalles de palabras que no existen', () => {
    const ids = new Set(ALL_WORDS.map((w) => w.id))
    expect([...DETAILS.keys()].filter((id) => !ids.has(id))).toEqual([])
  })
})

describe('textos de detalle', () => {
  it('describe las formas irregulares y de qué palabra es forma', () => {
    expect(formsText({ forms: { past: 'went', participle: 'gone' } })).toBe('Pasado: went · Participio: gone')
    expect(formsText({ forms: { past: 'made', participle: 'made' } })).toBe('Pasado y participio: made')
    expect(formsText({ forms: { plural: 'children' } })).toBe('Plural: children')
    expect(formsText({ of: { lemma: 'go', form: 'past' } })).toBe('Pasado de go')
    expect(formsText({})).toBeNull()
  })

  it('encuentra la palabra en la frase como palabra completa', () => {
    expect(splitAround('I went home early.', 'went')).toEqual(['I ', 'went', ' home early.'])
    expect(splitAround('An apple a day.', 'a')).toEqual(['An apple ', 'a', ' day.'])
    expect(splitAround('Well-known places are busy.', 'well-known')).toEqual(['', 'Well-known', ' places are busy.'])
    expect(splitAround('Nothing here.', 'no')).toBeNull()
  })

  it('valida entradas dañadas sin romper el resto', () => {
    const map = parseDetails({
      ok: { ipa: '/a/' },
      mal: 'x',
      raro: { forms: { past: 1 }, of: { lemma: 'go', form: 'otro' } },
    })
    expect(map.get('ok')).toEqual({ ipa: '/a/' })
    expect(map.get('mal')).toEqual({})
    expect(map.get('raro')).toEqual({})
  })
})
