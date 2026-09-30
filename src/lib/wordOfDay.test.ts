import { describe, expect, it } from 'vitest'
import { ALL_WORDS, LEVEL_SIZE } from './decks'
import { cardKey, EMPTY_PROGRESS } from './progress'
import { fromLeitner } from './scheduler'
import { CONTENT_POS } from './types'
import { wordOfDay } from './wordOfDay'

const rank = (id: string) => ALL_WORDS.findIndex((word) => word.id === id)

describe('palabra del día', () => {
  it('es la misma todo el día y cambia de un día a otro', () => {
    expect(wordOfDay(EMPTY_PROGRESS, '2026-09-29')).toBe(wordOfDay(EMPTY_PROGRESS, '2026-09-29'))
    const week = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'].map(
      (day) => wordOfDay(EMPTY_PROGRESS, day).id,
    )
    expect(new Set(week).size).toBeGreaterThan(3)
  })

  it('es una palabra de contenido que aún no se ha visto, cerca de por donde va el estudiante', () => {
    const cards = Object.fromEntries(
      ALL_WORDS.slice(0, 300).map((w) => [cardKey('en-es', w.id), fromLeitner(4, 0, 3, 0)]),
    )
    const word = wordOfDay({ ...EMPTY_PROGRESS, cards }, '2026-09-29')
    expect(CONTENT_POS.has(word.pos)).toBe(true)
    expect(rank(word.id)).toBeGreaterThanOrEqual(300)
    expect(rank(word.id)).toBeLessThan(300 + 400)
  })

  it('empieza en el nivel de partida de la sesión inteligente', () => {
    expect(rank(wordOfDay(EMPTY_PROGRESS, '2026-09-29', 5).id)).toBeGreaterThanOrEqual(4 * LEVEL_SIZE)
  })
})
