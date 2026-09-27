import { describe, expect, it } from 'vitest'
import { dayKey, EMPTY_PROGRESS, type ProgressData } from './progress'
import { activityLevel, activityWeeks, formatDuration, masteredSeries, totals, weeklyAccuracy } from './stats'

// Miércoles 23 de septiembre de 2026, 10:00: la semana en curso tiene días por delante.
const NOW = new Date(2026, 8, 23, 10).getTime()
const DAY = 86_400_000
const key = (offset: number) => dayKey(NOW + offset * DAY)
const day = (answers: number, clean = answers, mastered?: number) => ({
  answers,
  clean,
  fresh: 0,
  ms: answers * 3000,
  ...(mastered === undefined ? {} : { mastered }),
})

describe('estadísticas', () => {
  it('la intensidad del mapa de calor depende de la meta diaria', () => {
    expect([0, 5, 15, 25, 60].map((n) => activityLevel(n, 20))).toEqual([0, 1, 2, 3, 4])
  })

  it('el mapa de calor va de lunes a domingo y termina en la semana actual', () => {
    const weeks = activityWeeks({ [key(0)]: day(20), [key(-7)]: day(5) }, NOW, 4, 20)
    expect(weeks).toHaveLength(4)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(new Date(weeks[0][0].time).getDay()).toBe(1)
    const today = weeks[3].find((d) => d.key === key(0))
    expect(today).toMatchObject({ answers: 20, level: 3, future: false })
    expect(weeks[3].find((d) => d.key === key(1))?.future).toBe(true)
    expect(weeks[2].find((d) => d.key === key(-7))?.level).toBe(1)
  })

  it('las dominadas se arrastran en los días sin práctica y no hay puntos antes del primer dato', () => {
    const series = masteredSeries({ [key(-40)]: day(5, 5, 3), [key(-2)]: day(5, 5, 10) }, NOW, 5)
    expect(series.map((p) => p.value)).toEqual([3, 3, 10, 10, 10])
    expect(masteredSeries({ [key(-1)]: day(5, 5, 7) }, NOW, 4).map((p) => p.value)).toEqual([7, 7])
  })

  it('precisión por semana, sin dato cuando no hubo práctica', () => {
    const weeks = weeklyAccuracy({ [key(0)]: day(10, 8), [key(-1)]: day(10, 10) }, NOW, 3)
    expect(weeks.map((w) => w.accuracy)).toEqual([null, null, 0.9])
  })

  it('totales: racha, días, tiempo y precisión de 30 días', () => {
    const progress: ProgressData = {
      ...EMPTY_PROGRESS,
      days: [key(-1), key(0)],
      history: { [key(-40)]: day(10, 0), [key(-1)]: day(10, 5), [key(0)]: day(10, 10) },
    }
    expect(totals(progress, NOW)).toEqual({ streak: 2, daysPracticed: 2, answers: 30, ms: 90_000, accuracy30: 0.75 })
  })

  it('duración legible', () => {
    expect([10_000, 45 * 60_000, 3 * 3_600_000 + 20 * 60_000, 2 * 3_600_000].map(formatDuration)).toEqual([
      'menos de 1 min',
      '45 min',
      '3 h 20 min',
      '2 h',
    ])
  })
})
