import { beforeEach, describe, expect, it } from 'vitest'
import { appendEvent, clearEvents, type StudyEvent } from './events'
import {
  dailyMissions,
  evaluateMissions,
  longestCleanRun,
  MISSION_CATALOG,
  MISSIONS_PER_DAY,
  settleMissions,
} from './missions'
import { dayKey, EMPTY_DAY, getProgress, recordAnswer, resetProgress } from './progress'
import { XP_CLEAN_BONUS, XP_NEW_WORD, XP_PER_ANSWER } from './xp'

const NOW = new Date(2026, 9, 1, 10).getTime()
const event = (r: StudyEvent['r'], track: StudyEvent['track'] = 'en-es', f?: true): StudyEvent => ({
  t: NOW,
  id: 'the',
  track,
  r,
  ms: 1000,
  ...(f ? { f } : {}),
})

beforeEach(() => {
  resetProgress()
  clearEvents()
})

describe('misiones del día', () => {
  it('cada misión tiene id único', () => {
    expect(new Set(MISSION_CATALOG.map((m) => m.id)).size).toBe(MISSION_CATALOG.length)
  })

  it('son tres distintas, las mismas todo el día y cambian de un día a otro', () => {
    const today = dailyMissions('2026-10-01')
    expect(today).toHaveLength(MISSIONS_PER_DAY)
    expect(new Set(today.map((m) => m.id)).size).toBe(MISSIONS_PER_DAY)
    expect(dailyMissions('2026-10-01')).toEqual(today)
    const week = Array.from({ length: 7 }, (_, i) =>
      dailyMissions(`2026-10-0${i + 1}`)
        .map((m) => m.id)
        .join(),
    )
    expect(new Set(week).size).toBeGreaterThan(3)
  })

  it('miden lo practicado hoy', () => {
    const input = {
      today: { ...EMPTY_DAY, answers: 30, clean: 28, fresh: 6, ms: 11 * 60_000 },
      events: [
        event('clean', 'listen'),
        event('miss'),
        event('clean', 'type'),
        event('clean', 'es-en'),
        event('clean'),
      ],
      dailyGoal: 20,
    }
    const byId = Object.fromEntries(MISSION_CATALOG.map((mission) => [mission.id, mission.measure(input)]))
    expect(byId['answers-25']).toEqual({ value: 25, target: 25 })
    expect(byId['answers-60']).toEqual({ value: 30, target: 60 })
    expect(byId['fresh-5']).toEqual({ value: 5, target: 5 })
    expect(byId['run-10']).toEqual({ value: 3, target: 10 })
    expect(byId['listen-8']).toEqual({ value: 1, target: 8 })
    expect(byId['type-8']).toEqual({ value: 1, target: 8 })
    expect(byId['recall-10']).toEqual({ value: 1, target: 10 })
    expect(byId['reviews-15']).toEqual({ value: 5, target: 15 })
    expect(byId['minutes-10']).toEqual({ value: 10, target: 10 })
    expect(byId['accuracy-90']).toEqual({ value: 90, target: 90 })
    expect(
      MISSION_CATALOG.find((m) => m.id === 'accuracy-90')?.measure({
        ...input,
        today: { ...input.today, answers: 12 },
      }),
    ).toEqual({ value: 12, target: 20 })
  })

  it('la racha de aciertos seguidos se corta con cada fallo', () => {
    expect(longestCleanRun([])).toBe(0)
    expect(longestCleanRun([event('clean'), event('clean'), event('miss'), event('clean')])).toBe(2)
    expect(longestCleanRun([event('clean'), event('almost'), event('clean')])).toBe(1)
  })

  it('evalúa las tres del día con lo practicado', () => {
    const statuses = evaluateMissions('2026-10-01', { today: EMPTY_DAY, events: [], dailyGoal: 20 })
    expect(statuses).toHaveLength(MISSIONS_PER_DAY)
    expect(statuses.every((status) => status.value === 0 && !status.done)).toBe(true)
  })

  it('cada misión cumplida se premia una sola vez, con su experiencia', () => {
    const day = dayKey(NOW)
    const mission = dailyMissions(day).find((m) => m.id === 'answers-25') ?? dailyMissions(day)[0]
    // Se responde hasta cumplir la primera misión del día que mida respuestas (o cualquiera).
    for (let i = 0; i < 70; i++) {
      recordAnswer('en-es', 'the', { clean: true, ms: 1000 }, NOW + i * 1000)
      appendEvent({ t: NOW + i * 1000, id: 'the', track: 'en-es', r: 'clean', ms: 1000 })
    }
    const before = getProgress().xp
    const settled = settleMissions(NOW + 80_000)
    expect(settled.map((m) => m.id)).toContain(mission.id)
    expect(getProgress().xp).toBe(before + settled.reduce((sum, m) => sum + m.xp, 0))
    expect(getProgress().missions).toEqual({ day, done: settled.map((m) => m.id) })
    expect(settleMissions(NOW + 90_000)).toEqual([])
    expect(getProgress().xp).toBe(before + settled.reduce((sum, m) => sum + m.xp, 0))
  })

  it('las respuestas suman experiencia en el progreso', () => {
    recordAnswer('en-es', 'the', { clean: true, ms: 1000 }, NOW)
    expect(getProgress().xp).toBe(XP_PER_ANSWER + XP_CLEAN_BONUS + XP_NEW_WORD)
    recordAnswer('en-es', 'the', { clean: false, ms: 1000 }, NOW + 1000)
    expect(getProgress().xp).toBe(2 * XP_PER_ANSWER + XP_CLEAN_BONUS + XP_NEW_WORD)
  })
})
