import { describe, expect, it } from 'vitest'
import {
  type PlanLevel,
  planDailyGoal,
  planItems,
  planNewPerDay,
  planPace,
  planWeek,
  planWeeks,
  parsePlan,
  PROGRAM_IDS,
  PROGRAMS,
  recommendText,
  type StudyPlan,
  studyDaysThisWeek,
  todayKinds,
  topicOfDay,
} from './studyPlan'

const START = new Date(2026, 9, 5, 9).getTime()
const DAY = 86_400_000
const PLAN: StudyPlan = { program: 'complete', from: 'a1', to: 'a2', minutes: 30, days: 5, startedAt: START }
const lessons = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i + 1}`, title: `${prefix} ${i + 1}` }))
const LEVELS: PlanLevel[] = [
  { id: 'a1', lessons: lessons('a1', 4) },
  { id: 'a2', lessons: lessons('a2', 3) },
  { id: 'b1', lessons: lessons('b1', 2) },
]

describe('programas', () => {
  it('reparten todo el tiempo y proponen niveles en orden', () => {
    const totals = PROGRAM_IDS.map((id) => {
      const { shares } = PROGRAMS[id]
      return Math.round((shares.course + shares.vocabulary + shares.listening + shares.speaking) * 1000)
    })
    expect(totals).toEqual(PROGRAM_IDS.map(() => 1000))
    const valid = PROGRAM_IDS.filter((id) =>
      parsePlan({ ...PLAN, program: id, from: PROGRAMS[id].from, to: PROGRAMS[id].to }),
    )
    expect(valid).toEqual([...PROGRAM_IDS])
  })
})

describe('plan de estudio', () => {
  it('valida lo guardado: niveles al revés u opciones inventadas no valen', () => {
    expect(parsePlan(PLAN)).toEqual(PLAN)
    expect(parsePlan({ ...PLAN, from: 'b1', to: 'a1' })).toBeNull()
    expect(parsePlan({ ...PLAN, minutes: 17 })).toBeNull()
    expect(parsePlan({ ...PLAN, program: 'magia' })).toBeNull()
    expect(parsePlan(null)).toBeNull()
  })

  it('recorre las lecciones y el examen de cada nivel del plan, en orden', () => {
    const items = planItems(PLAN, LEVELS)
    expect(items.map((item) => item.id)).toEqual([
      'a1-1',
      'a1-2',
      'a1-3',
      'a1-4',
      'examen',
      'a2-1',
      'a2-2',
      'a2-3',
      'examen',
    ])
    expect(items[4]).toMatchObject({ level: 'a1', kind: 'exam', title: 'Examen A1' })
  })

  it('reparte las lecciones en semanas según el tiempo del curso', () => {
    // 30 min × 5 días × 45 % = 67,5 min de curso por semana: dos lecciones de 25.
    const weeks = planWeeks(PLAN, planItems(PLAN, LEVELS))
    // El examen y una lección (45 + 25 = 70 min) se pasan de 67,5, pero caben con la holgura del 10 %.
    expect(weeks.map((week) => week.map((item) => item.id))).toEqual([
      ['a1-1', 'a1-2'],
      ['a1-3', 'a1-4'],
      ['examen', 'a2-1'],
      ['a2-2', 'a2-3'],
      ['examen'],
    ])
    // Con poco tiempo, al menos una cosa por semana.
    const slow = planWeeks({ ...PLAN, minutes: 10, days: 3 }, planItems(PLAN, LEVELS))
    expect(slow).toHaveLength(9)
  })

  it('sabe en qué semana va y si va al día', () => {
    expect(planWeek(PLAN, START)).toBe(1)
    expect(planWeek(PLAN, START + 6 * DAY)).toBe(1)
    expect(planWeek(PLAN, START + 7 * DAY)).toBe(2)
    const weeks = planWeeks(PLAN, planItems(PLAN, LEVELS))
    expect(planPace(weeks, 0, 1)).toBe('on-track')
    expect(planPace(weeks, 3, 1)).toBe('ahead')
    expect(planPace(weeks, 0, 2)).toBe('on-track')
    expect(planPace(weeks, 1, 3)).toBe('behind')
    expect(planPace(weeks, 2, 3)).toBe('on-track')
  })

  it('cada día propone vocabulario y, según el tiempo, el resto en rotación', () => {
    expect(todayKinds(PLAN, START)).toEqual(['vocabulary', 'course', 'listening', 'speaking'])
    const short = { ...PLAN, minutes: 10 as const }
    const days = Array.from({ length: 4 }, (_, i) => todayKinds(short, START + i * DAY))
    expect(days).toEqual([
      ['vocabulary', 'course'],
      ['vocabulary', 'listening'],
      ['vocabulary', 'course'],
      ['vocabulary', 'speaking'],
    ])
    const medium = { ...PLAN, minutes: 20 as const }
    expect(todayKinds(medium, START)).toEqual(['vocabulary', 'course', 'listening'])
    expect(todayKinds(medium, START + DAY)).toEqual(['vocabulary', 'course', 'speaking'])
    // Sin curso por delante, solo escucha y habla.
    expect(todayKinds(medium, START, false)).toEqual(['vocabulary', 'listening', 'speaking'])
  })

  it('las colecciones del programa salen en días alternos', () => {
    const travel: StudyPlan = { ...PLAN, program: 'travel' }
    expect(topicOfDay(travel, START)).toBeNull()
    expect(topicOfDay(travel, START + DAY)).toBe('transporte')
    expect(topicOfDay(travel, START + 3 * DAY)).toBe('lugares')
    expect(topicOfDay(PLAN, START + DAY)).toBeNull()
  })

  it('ajusta la meta diaria al tiempo de vocabulario', () => {
    expect(planDailyGoal({ program: 'complete', minutes: 10 })).toBe(20)
    expect(planDailyGoal({ program: 'complete', minutes: 30 })).toBe(60)
    expect(planNewPerDay(20)).toBe(10)
    expect(planNewPerDay(60)).toBe(40)
  })

  it('recomienda un texto del nivel en curso sin hacer, de sus temas primero', () => {
    const texts = [
      { id: 'a1-a', level: 'a1' as const, topic: 'Vida diaria' },
      { id: 'a2-a', level: 'a2' as const, topic: 'Trabajo' },
      { id: 'a2-b', level: 'a2' as const, topic: 'Viajes' },
      { id: 'b1-a', level: 'b1' as const, topic: 'Viajes' },
    ]
    expect(recommendText(texts, 'a2', () => false)?.id).toBe('a2-a')
    expect(recommendText(texts, 'a2', () => false, ['Viajes'])?.id).toBe('a2-b')
    expect(recommendText(texts, 'a2', (id) => id.startsWith('a2'))?.id).toBe('a1-a')
    expect(recommendText(texts, 'a2', () => true)?.id).toBe('a2-a')
  })

  it('cuenta los días con práctica de la semana del plan', () => {
    const days = ['2026-10-04', '2026-10-05', '2026-10-07', '2026-10-12']
    expect(studyDaysThisWeek(PLAN, days, START + 3 * DAY)).toBe(2)
    expect(studyDaysThisWeek(PLAN, days, START + 7 * DAY)).toBe(1)
  })
})
