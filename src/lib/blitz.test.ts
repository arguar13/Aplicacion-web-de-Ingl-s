import { describe, expect, it } from 'vitest'
import { blitzDeck, blitzPool } from './blitz'
import { ALL_WORDS } from './decks'
import { EMPTY_PROGRESS, getProgress, recordPractice, resetProgress, todayStats } from './progress'
import { fromLeitner } from './scheduler'

const NOW = new Date(2026, 8, 27, 10).getTime()

describe('relámpago', () => {
  it('juega solo con palabras ya vistas en traducir', () => {
    const progress = {
      ...EMPTY_PROGRESS,
      cards: {
        [`en-es:${ALL_WORDS[3].id}`]: fromLeitner(2, NOW, 1, 0),
        [`listen:${ALL_WORDS[4].id}`]: fromLeitner(2, NOW, 1, 0),
      },
    }
    expect(blitzPool(progress)).toEqual([ALL_WORDS[3]])
  })

  it('no repite palabra hasta agotarlas y sus opciones también son palabras vistas', () => {
    const pool = ALL_WORDS.slice(0, 20)
    const next = blitzDeck(pool)
    const seen = Array.from({ length: 20 }, () => next())
    expect(new Set(seen.map((r) => r.word.id)).size).toBe(20)
    for (const round of seen) {
      expect(round.options).toContain(round.word)
      expect(round.options.every((o) => pool.includes(o))).toBe(true)
    }
  })

  it('cuenta como práctica del día sin tocar las tarjetas', () => {
    resetProgress()
    recordPractice({ answers: 15, clean: 12, ms: 60_000 }, NOW)
    expect(todayStats(getProgress(), NOW)).toEqual({ answers: 15, clean: 12, fresh: 0, ms: 60_000 })
    expect(getProgress().cards).toEqual({})
  })
})
