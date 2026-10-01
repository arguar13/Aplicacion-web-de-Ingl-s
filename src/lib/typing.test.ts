import { describe, expect, it } from 'vitest'
import { diffAgainst, editDistance, hintFor, judgeTyped } from './typing'

/** La respuesta correcta con las letras que no coinciden en mayúscula. */
const marks = (input: string, target: string) =>
  diffAgainst(input, target)
    .map((l) => (l.ok ? l.char : l.char.toUpperCase()))
    .join('')

describe('respuestas escritas', () => {
  it('acepta la respuesta sin importar mayúsculas, espacios ni apóstrofos tipográficos', () => {
    expect(judgeTyped('  Water ', 'water')).toBe('exact')
    expect(judgeTyped('don’t', "don't")).toBe('exact')
    expect(judgeTyped('in   addition', 'in addition')).toBe('exact')
  })

  it('un error en una palabra larga es "casi"; dos, o en una corta, es incorrecta', () => {
    expect(judgeTyped('watr', 'water')).toBe('almost')
    expect(judgeTyped('wtaer', 'water')).toBe('almost')
    expect(judgeTyped('wtr', 'water')).toBe('wrong')
    expect(judgeTyped('on', 'in')).toBe('wrong')
    expect(judgeTyped('', 'water')).toBe('wrong')
  })

  it('la distancia cuenta el intercambio de dos letras vecinas como un solo error', () => {
    expect(editDistance('wtaer', 'water')).toBe(1)
    expect(editDistance('fomr', 'from')).toBe(2)
    expect(editDistance('kitten', 'sitting')).toBe(3)
  })

  it('marca qué letras de la respuesta correcta no coinciden', () => {
    expect(marks('watr', 'water')).toBe('watEr')
    expect(marks('water', 'water')).toBe('water')
    expect(marks('', 'go')).toBe('GO')
  })
})

describe('pistas', () => {
  it('destapa las letras de una en una y nunca la última', () => {
    expect(hintFor('water', 0)).toEqual({ shown: '', hidden: '_____', complete: false })
    expect(hintFor('water', 1)).toEqual({ shown: 'w', hidden: '____', complete: false })
    expect(hintFor('water', 4)).toEqual({ shown: 'wate', hidden: '_', complete: true })
    expect(hintFor('water', 9)).toEqual({ shown: 'wate', hidden: '_', complete: true })
  })

  it('los espacios y apóstrofos se ven siempre: no son letras que adivinar', () => {
    expect(hintFor("don't", 3)).toEqual({ shown: 'don', hidden: "'_", complete: true })
    expect(hintFor('in addition', 2)).toEqual({ shown: 'in', hidden: ' ________', complete: false })
    expect(hintFor('a', 1)).toEqual({ shown: '', hidden: '_', complete: true })
  })
})
