import { describe, expect, it } from 'vitest'
import { CEFR_LEVELS, formatEta, journey, MIN_PACE_DAYS } from './journey'
import { dayKey, EMPTY_PROGRESS, type ProgressData } from './progress'
import { fromLeitner } from './scheduler'

const NOW = new Date(2026, 9, 1, 10).getTime()
const DAY = 86_400_000
const key = (daysAgo: number) => dayKey(NOW - daysAgo * DAY)
const day = (mastered: number) => ({ answers: 10, clean: 9, fresh: 1, ms: 1000, mastered })
/** Progreso con `count` palabras dominadas en traducir. */
const withMastered = (count: number, history: ProgressData['history'] = {}): ProgressData => ({
  ...EMPTY_PROGRESS,
  cards: Object.fromEntries(Array.from({ length: count }, (_, i) => [`en-es:w${i}`, fromLeitner(5, NOW, 5, 0)])),
  history,
})

describe('tu camino', () => {
  it('los niveles van en orden de vocabulario', () => {
    expect(CEFR_LEVELS.map((l) => l.words)).toEqual(CEFR_LEVELS.map((l) => l.words).toSorted((a, b) => a - b))
  })

  it('sin práctica: A1, sin ritmo ni estimaciones', () => {
    const result = journey(EMPTY_PROGRESS, NOW)
    expect(result).toMatchObject({
      mastered: 0,
      current: { label: 'A1' },
      next: { label: 'A2' },
      progress: 0,
      pace: null,
    })
    expect(result.eta.every((e) => e.days === null)).toBe(true)
    expect(result.eta.map((e) => e.level.label)).toEqual(['A2', 'B1', 'B2', 'C1', 'C2'])
  })

  it('sitúa el nivel por las dominadas y mide el avance dentro de él', () => {
    expect(journey(withMastered(1500), NOW)).toMatchObject({
      current: { label: 'B1' },
      next: { label: 'B2' },
      progress: 0,
    })
    expect(journey(withMastered(2250), NOW).progress).toBeCloseTo(0.5)
    expect(journey(withMastered(9000), NOW)).toMatchObject({
      current: { label: 'C2' },
      next: null,
      progress: 1,
      eta: [],
    })
  })

  it('el ritmo sale de los últimos 30 días y estima cuándo llega cada nivel', () => {
    // Hace 20 días había 100 dominadas; hoy 400: 15 por día.
    const result = journey(withMastered(400, { [key(20)]: day(100), [key(45)]: day(10) }), NOW)
    expect(result.observedDays).toBe(20)
    expect(result.pace).toBe(15)
    expect(result.eta[0]).toEqual({ level: CEFR_LEVELS[1], days: Math.ceil((750 - 400) / 15) })
    expect(result.eta.at(-1)?.days).toBe(Math.ceil((8000 - 400) / 15))
  })

  it('con pocos días observados no hay ritmo; sin avance, el ritmo es cero y no hay fecha', () => {
    expect(journey(withMastered(400, { [key(MIN_PACE_DAYS - 1)]: day(100) }), NOW).pace).toBeNull()
    const flat = journey(withMastered(400, { [key(10)]: day(400) }), NOW)
    expect(flat.pace).toBe(0)
    expect(flat.eta[0].days).toBeNull()
  })

  it('las estimaciones se leen en días, semanas, meses o años', () => {
    expect(formatEta(1)).toBe('en 1 día')
    expect(formatEta(10)).toBe('en 10 días')
    expect(formatEta(21)).toBe('en 3 semanas')
    expect(formatEta(150)).toBe('en 5 meses')
    expect(formatEta(800)).toBe('en 2 años')
  })
})
