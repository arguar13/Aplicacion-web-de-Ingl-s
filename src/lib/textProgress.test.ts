import { beforeEach, describe, expect, it } from 'vitest'
import { getProgress, resetProgress } from './progress'
import {
  getTextProgress,
  mergeTextProgress,
  parseTextProgress,
  recordListened,
  recordSpoken,
  resetTextProgress,
  spokenPassed,
  textsToday,
  XP_LISTEN_AGAIN,
  XP_LISTEN_FIRST,
  XP_SPOKEN_PASS,
  XP_SPOKEN_WORD,
} from './textProgress'

const NOW = new Date(2026, 9, 26, 10).getTime()
const DAY = 86_400_000

beforeEach(() => {
  resetProgress()
  resetTextProgress()
})

describe('progreso de los textos', () => {
  it('valida lo guardado', () => {
    expect(
      parseTextProgress({
        listened: { 'a1-x': { times: 2, at: 5 }, 'Mal id': { times: 1, at: 1 }, 'a1-y': { times: 0, at: 1 } },
        spoken: { 'a1-x': { best: 1.3, at: 4 }, 'a1-z': { best: 'alta', at: 1 } },
      }),
    ).toEqual({ listened: { 'a1-x': { times: 2, at: 5 } }, spoken: { 'a1-x': { best: 1, at: 4, last: 4 } } })
    expect(parseTextProgress(undefined)).toEqual({ listened: {}, spoken: {} })
  })

  it('cuenta las escuchas y premia más la primera', () => {
    recordListened('a1-x', NOW)
    recordListened('a1-x', NOW + 1)
    expect(getTextProgress().listened['a1-x']).toEqual({ times: 2, at: NOW + 1 })
    expect(getProgress().xp).toBe(XP_LISTEN_FIRST + XP_LISTEN_AGAIN)
  })

  it('en voz alta guarda la mejor nota y premia superarla una sola vez', () => {
    recordSpoken('a1-x', 40, 0.9, NOW)
    recordSpoken('a1-x', 20, 0.5, NOW + DAY)
    recordSpoken('a1-x', 45, 0.95, NOW + 2 * DAY)
    expect(getTextProgress().spoken['a1-x']).toEqual({ best: 0.95, at: NOW + 2 * DAY, last: NOW + 2 * DAY })
    expect(getProgress().xp).toBe((40 + 20 + 45) * XP_SPOKEN_WORD + XP_SPOKEN_PASS)
    expect(spokenPassed(getTextProgress(), 'a1-x')).toBe(true)
  })

  it('sabe si hoy se escuchó o se leyó algo, aunque la lectura no mejorase la nota', () => {
    recordSpoken('a1-x', 10, 0.9, NOW - DAY)
    recordSpoken('a1-x', 5, 0.3, NOW)
    expect(textsToday(getTextProgress(), NOW)).toEqual({ listened: false, spoken: true })
    recordListened('a1-y', NOW)
    expect(textsToday(getTextProgress(), NOW).listened).toBe(true)
  })

  it('al combinar dos dispositivos se queda con lo más avanzado', () => {
    const merged = mergeTextProgress(
      { listened: { a: { times: 3, at: 10 } }, spoken: { a: { best: 0.6, at: 5, last: 20 } } },
      { listened: { a: { times: 1, at: 30 }, b: { times: 1, at: 2 } }, spoken: { a: { best: 0.9, at: 8, last: 9 } } },
    )
    expect(merged).toEqual({
      listened: { a: { times: 3, at: 30 }, b: { times: 1, at: 2 } },
      spoken: { a: { best: 0.9, at: 8, last: 20 } },
    })
  })
})
