import { describe, expect, it } from 'vitest'
import {
  RANKS,
  rankOf,
  XP_CLEAN_BONUS,
  XP_NEW_WORD,
  XP_PER_ANSWER,
  xpForAnswer,
  xpForPractice,
  xpFromHistory,
} from './xp'

describe('experiencia', () => {
  it('cada respuesta suma más si es a la primera o una palabra nueva', () => {
    expect(xpForAnswer({ clean: false, fresh: false })).toBe(XP_PER_ANSWER)
    expect(xpForAnswer({ clean: true, fresh: false })).toBe(XP_PER_ANSWER + XP_CLEAN_BONUS)
    expect(xpForAnswer({ clean: true, fresh: true })).toBe(XP_PER_ANSWER + XP_CLEAN_BONUS + XP_NEW_WORD)
    expect(xpForPractice({ answers: 10, clean: 7 })).toBe(10 * XP_PER_ANSWER + 7 * XP_CLEAN_BONUS)
  })

  it('quien ya practicaba arranca con la experiencia de su historial', () => {
    expect(xpFromHistory({})).toBe(0)
    expect(
      xpFromHistory({
        '2026-09-01': { answers: 10, clean: 8, fresh: 2, ms: 0 },
        '2026-09-02': { answers: 5, clean: 5, fresh: 0, ms: 0 },
      }),
    ).toBe(15 * XP_PER_ANSWER + 13 * XP_CLEAN_BONUS + 2 * XP_NEW_WORD)
  })

  it('los rangos suben con la experiencia y el último no tiene siguiente', () => {
    const thresholds = RANKS.map((rank) => rank.xp)
    expect(thresholds).toEqual(thresholds.toSorted((a, b) => a - b))
    expect(rankOf(0)).toMatchObject({ level: 1, rank: { name: 'Novato' }, next: { name: 'Aprendiz' }, progress: 0 })
    expect(rankOf(150)).toMatchObject({ level: 1, progress: 0.5 })
    expect(rankOf(300)).toMatchObject({ level: 2, rank: { name: 'Aprendiz' } })
    const last = RANKS[RANKS.length - 1]
    expect(rankOf(last.xp + 999_999)).toMatchObject({ rank: last, next: null, progress: 1 })
  })
})
