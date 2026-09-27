import { describe, expect, it } from 'vitest'
import { ALL_WORDS } from './decks'
import { type DictionaryFilters, searchWords } from './dictionary'
import { EMPTY_PROGRESS, type ProgressData } from './progress'
import { fromLeitner } from './scheduler'

const ALL: DictionaryFilters = { query: '', status: 'all', level: null, pos: null }
const ids = (words: { id: string }[]) => words.map((w) => w.id)

describe('diccionario', () => {
  it('sin filtros devuelve todo el vocabulario por frecuencia', () => {
    expect(searchWords(ALL, EMPTY_PROGRESS, 'en-es')).toEqual(ALL_WORDS)
  })

  it('busca en inglés y en español, sin tildes ni mayúsculas, lo exacto primero', () => {
    expect(ids(searchWords({ ...ALL, query: 'WATER' }, EMPTY_PROGRESS, 'en-es'))[0]).toBe('water')
    expect(ids(searchWords({ ...ALL, query: 'arbol' }, EMPTY_PROGRESS, 'en-es'))[0]).toBe('tree')
    const para = ids(searchWords({ ...ALL, query: 'para' }, EMPTY_PROGRESS, 'en-es'))
    expect(para.slice(0, 2)).toEqual(expect.arrayContaining(['to', 'for']))
  })

  it('filtra por nivel, categoría, estado y favoritas', () => {
    const level2 = searchWords({ ...ALL, level: 2 }, EMPTY_PROGRESS, 'en-es')
    expect(level2).toEqual(ALL_WORDS.slice(500, 1000))
    expect(searchWords({ ...ALL, pos: 'verb' }, EMPTY_PROGRESS, 'en-es').every((w) => w.pos === 'verb')).toBe(true)

    const progress: ProgressData = {
      ...EMPTY_PROGRESS,
      cards: {
        'en-es:the': fromLeitner(5, 0, 5, 0),
        'en-es:water': fromLeitner(1, 0, 3, 2),
        'es-en:tree': fromLeitner(5, 0, 5, 0),
      },
      favorites: ['tree'],
    }
    expect(ids(searchWords({ ...ALL, status: 'mastered' }, progress, 'en-es'))).toEqual(['the'])
    expect(ids(searchWords({ ...ALL, status: 'learning' }, progress, 'en-es'))).toEqual(['water'])
    expect(ids(searchWords({ ...ALL, status: 'hard' }, progress, 'en-es'))).toEqual(['water'])
    expect(ids(searchWords({ ...ALL, status: 'mastered' }, progress, 'es-en'))).toEqual(['tree'])
    expect(ids(searchWords({ ...ALL, status: 'favorite' }, progress, 'en-es'))).toEqual(['tree'])
    expect(searchWords({ ...ALL, status: 'new' }, progress, 'en-es')).toHaveLength(ALL_WORDS.length - 2)
  })

  it('busca en todo el vocabulario en menos de 50 ms', () => {
    const start = performance.now()
    for (const query of ['a', 'wat', 'casa', 'zzz', 'e']) searchWords({ ...ALL, query }, EMPTY_PROGRESS, 'en-es')
    expect((performance.now() - start) / 5).toBeLessThan(50)
  })
})
