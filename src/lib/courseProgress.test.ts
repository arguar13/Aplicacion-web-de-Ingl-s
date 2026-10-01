import { beforeEach, describe, expect, it } from 'vitest'
import {
  examPassed,
  getCourseProgress,
  levelSummary,
  mergeCourseProgress,
  nextStep,
  parseCourseProgress,
  recordExam,
  recordLesson,
  recordQuiz,
  resetCourseProgress,
  XP_EXAM,
  XP_EXERCISE,
  XP_LESSON,
  XP_QUIZ_PERFECT,
} from './courseProgress'
import { getProgress, resetProgress } from './progress'

const NOW = new Date(2026, 9, 1, 10).getTime()

beforeEach(() => {
  resetProgress()
  resetCourseProgress()
})

describe('progreso del curso', () => {
  it('valida lo guardado: descarta niveles desconocidos y notas sin forma', () => {
    expect(
      parseCourseProgress({
        lessons: { 'a1/to-be': { best: 1.4, at: 5 }, 'zz/x': { best: 1, at: 1 }, 'a1/rota': { best: 'alta' } },
        exams: { a1: { best: 0.9, at: 2 }, c9: { best: 1, at: 1 } },
      }),
    ).toEqual({ lessons: { 'a1/to-be': { best: 1, at: 5 } }, exams: { a1: { best: 0.9, at: 2 } }, quizzes: {} })
    expect(parseCourseProgress(null)).toEqual({ lessons: {}, exams: {}, quizzes: {} })
    expect(
      parseCourseProgress({ quizzes: { a1: { best: 0.7, at: 1 }, mixto: { best: 1, at: 2 }, zz: { best: 1, at: 1 } } })
        .quizzes,
    ).toEqual({
      a1: { best: 0.7, at: 1 },
      mixto: { best: 1, at: 2 },
    })
  })

  it('una lección guarda su mejor nota y premia terminarla solo la primera vez', () => {
    recordLesson('a1', 'to-be', 4, 0.8, NOW)
    expect(getCourseProgress().lessons['a1/to-be']).toEqual({ best: 0.8, at: NOW })
    expect(getProgress().xp).toBe(4 * XP_EXERCISE + XP_LESSON)
    recordLesson('a1', 'to-be', 5, 1, NOW + 1000)
    expect(getCourseProgress().lessons['a1/to-be']).toEqual({ best: 1, at: NOW + 1000 })
    expect(getProgress().xp).toBe(9 * XP_EXERCISE + XP_LESSON)
    // Una nota peor no pisa la mejor.
    recordLesson('a1', 'to-be', 2, 0.4, NOW + 2000)
    expect(getCourseProgress().lessons['a1/to-be'].best).toBe(1)
  })

  it('el examen se aprueba con el 80 % y el premio por aprobar se cobra una vez', () => {
    expect(recordExam('a1', 7, 0.7, NOW)).toBe(false)
    expect(examPassed(getCourseProgress(), 'a1')).toBe(false)
    expect(getProgress().xp).toBe(7 * XP_EXERCISE)
    expect(recordExam('a1', 9, 0.9, NOW + 1)).toBe(true)
    expect(getProgress().xp).toBe(16 * XP_EXERCISE + XP_EXAM)
    expect(recordExam('a1', 10, 1, NOW + 2)).toBe(true)
    expect(getProgress().xp).toBe(26 * XP_EXERCISE + XP_EXAM)
    expect(levelSummary(getCourseProgress(), 'a1', ['to-be', 'articles'])).toMatchObject({
      done: 0,
      total: 2,
      passed: true,
    })
    // Las lecciones terminadas se cuentan por su clave completa (nivel/lección).
    recordLesson('a1', 'to-be', 5, 1, NOW + 3)
    expect(levelSummary(getCourseProgress(), 'a1', ['to-be', 'articles'])).toMatchObject({ done: 1, total: 2 })
    expect(levelSummary(getCourseProgress(), 'a2', ['to-be'])).toMatchObject({ done: 0, passed: false })
  })

  it('el siguiente paso es la primera lección pendiente del primer nivel sin aprobar, o su examen', () => {
    const levels = [
      {
        id: 'a1' as const,
        lessons: [
          { id: 'x', title: 'X' },
          { id: 'y', title: 'Y' },
        ],
      },
      { id: 'a2' as const, lessons: [{ id: 'z', title: 'Z' }] },
    ]
    expect(nextStep({ lessons: {}, exams: {}, quizzes: {} }, levels)).toEqual({
      level: 'a1',
      lesson: { id: 'x', title: 'X', index: 0 },
    })
    const done = { lessons: { 'a1/x': { best: 1, at: 1 }, 'a1/y': { best: 1, at: 1 } }, exams: {}, quizzes: {} }
    expect(nextStep(done, levels)).toEqual({ level: 'a1', lesson: null })
    const passed = { ...done, exams: { a1: { best: 0.9, at: 1 } } }
    expect(nextStep(passed, levels)).toEqual({ level: 'a2', lesson: { id: 'z', title: 'Z', index: 0 } })
    expect(nextStep({ ...passed, exams: { a1: { best: 1, at: 1 }, a2: { best: 1, at: 1 } } }, levels)).toBeNull()
  })

  it('un quiz guarda su mejor nota y un quiz perfecto da experiencia extra', () => {
    recordQuiz('a1', 7, 0.7, NOW)
    expect(getCourseProgress().quizzes.a1).toEqual({ best: 0.7, at: NOW })
    expect(getProgress().xp).toBe(7 * XP_EXERCISE)
    recordQuiz('mixto', 12, 1, NOW + 1)
    expect(getProgress().xp).toBe(19 * XP_EXERCISE + XP_QUIZ_PERFECT)
  })

  it('combinar dos progresos se queda con la mejor nota de cada cosa', () => {
    const merged = mergeCourseProgress(
      {
        lessons: { 'a1/x': { best: 0.5, at: 1 } },
        exams: { a1: { best: 0.9, at: 9 } },
        quizzes: { a1: { best: 0.5, at: 1 } },
      },
      {
        lessons: { 'a1/x': { best: 0.9, at: 2 }, 'a2/y': { best: 1, at: 3 } },
        exams: { a1: { best: 0.9, at: 4 } },
        quizzes: { a1: { best: 0.8, at: 2 }, mixto: { best: 1, at: 3 } },
      },
    )
    expect(merged).toEqual({
      lessons: { 'a1/x': { best: 0.9, at: 2 }, 'a2/y': { best: 1, at: 3 } },
      exams: { a1: { best: 0.9, at: 4 } },
      quizzes: { a1: { best: 0.8, at: 2 }, mixto: { best: 1, at: 3 } },
    })
  })
})
