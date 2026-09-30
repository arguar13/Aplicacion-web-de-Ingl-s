import { describe, expect, it } from 'vitest'
import type { StudyEvent } from './events'
import { dayKey, EMPTY_PROGRESS } from './progress'
import { DAY } from './scheduler'
import { weeklyReport } from './weekly'

const NOW = new Date(2026, 8, 29, 20).getTime()
const at = (daysAgo: number, hour: number) => {
  const d = new Date(NOW - daysAgo * DAY)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}
const ev = (t: number, id: string, r: StudyEvent['r'], first = false): StudyEvent => ({
  t,
  id,
  track: 'en-es',
  r,
  ms: 2000,
  ...(first ? { f: true as const } : {}),
})

describe('informe de la semana', () => {
  it('cuenta lo de los últimos 7 días: respuestas, acierto, nuevas y lo que más costó', () => {
    const events = [
      ev(at(10, 9), 'old', 'miss'),
      ev(at(2, 9), 'water', 'clean', true),
      ev(at(2, 9), 'tree', 'miss', true),
      ev(at(1, 9), 'tree', 'miss'),
      ev(at(1, 9), 'house', 'miss', true),
      ev(at(0, 9), 'tree', 'clean'),
    ]
    const report = weeklyReport(events, EMPTY_PROGRESS, NOW)
    expect(report.answers).toBe(5)
    expect(report.accuracy).toBeCloseTo(2 / 5)
    expect(report.newWords).toBe(3)
    expect(report.toughest).toEqual([
      { id: 'tree', misses: 2 },
      { id: 'house', misses: 1 },
    ])
  })

  it('las dominadas ganadas, los días activos y los minutos salen del progreso por día', () => {
    const history = {
      [dayKey(NOW - 9 * DAY)]: { answers: 10, clean: 8, fresh: 2, ms: 60_000, mastered: 40 },
      [dayKey(NOW - 3 * DAY)]: { answers: 20, clean: 15, fresh: 5, ms: 300_000, mastered: 50 },
      [dayKey(NOW)]: { answers: 12, clean: 11, fresh: 3, ms: 240_000, mastered: 55 },
    }
    const report = weeklyReport([], { ...EMPTY_PROGRESS, history }, NOW)
    expect(report).toMatchObject({ masteredGain: 15, activeDays: 2, ms: 540_000 })
  })

  it('la mejor franja horaria exige suficientes respuestas', () => {
    const morning = Array.from({ length: 20 }, (_, i) => ev(at(i % 7, 8), `m${i}`, i < 18 ? 'clean' : 'miss'))
    const night = Array.from({ length: 5 }, (_, i) => ev(at(i, 23), `n${i}`, 'clean'))
    expect(weeklyReport([...morning, ...night], EMPTY_PROGRESS, NOW).bestHours).toEqual({
      from: 6,
      to: 9,
      accuracy: 0.9,
    })
    expect(weeklyReport(night, EMPTY_PROGRESS, NOW).bestHours).toBeNull()
  })
})
