import { describe, expect, it } from 'vitest'
import a1 from '@/data/course/a1.json'
import a2 from '@/data/course/a2.json'
import { parseCourseLevel } from './course'
import { buildMixedQuiz, buildQuiz, MIXED_QUIZ_SIZE, QUIZ_SIZE, quizPool, quizSeed } from './courseQuiz'

const A1 = parseCourseLevel('a1', a1)
const A2 = parseCourseLevel('a2', a2)

describe('quizzes del curso', () => {
  it('el fondo reúne las preguntas de las lecciones y del examen', () => {
    const pool = quizPool(A1)
    expect(pool.length).toBe(A1.lessons.reduce((n, l) => n + l.exercises.length, 0) + A1.exam.length)
  })

  it('misma semilla, mismo quiz; otra semilla, otro quiz; sin repetir preguntas', () => {
    const pool = quizPool(A1)
    const first = buildQuiz(pool, 42)
    expect(first).toHaveLength(QUIZ_SIZE)
    expect(buildQuiz(pool, 42)).toEqual(first)
    expect(buildQuiz(pool, 43)).not.toEqual(first)
    expect(new Set(first).size).toBe(QUIZ_SIZE)
  })

  it('reparte los tipos: ninguno ocupa más de la mitad cuando hay variedad', () => {
    for (let seed = 0; seed < 20; seed++) {
      const quiz = buildQuiz(quizPool(A1), seed)
      const counts = new Map<string, number>()
      for (const exercise of quiz) counts.set(exercise.type, (counts.get(exercise.type) ?? 0) + 1)
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(QUIZ_SIZE / 2)
    }
  })

  it('con un fondo pequeño devuelve lo que hay', () => {
    const pool = quizPool(A1).slice(0, 3)
    expect(buildQuiz(pool, 1)).toHaveLength(3)
    expect(buildQuiz([], 1)).toEqual([])
  })

  it('el quiz mixto toma preguntas de todos los niveles', () => {
    const quiz = buildMixedQuiz([A1, A2], 7)
    expect(quiz).toHaveLength(MIXED_QUIZ_SIZE)
    const a1Pool = new Set(quizPool(A1))
    const fromA1 = quiz.filter((exercise) => a1Pool.has(exercise)).length
    expect(fromA1).toBeGreaterThanOrEqual(5)
    expect(fromA1).toBeLessThanOrEqual(7)
  })

  it('la semilla de un intento cambia con cada "otro quiz"', () => {
    const now = 1_700_000_000_000
    expect(quizSeed(now, 0)).toBe(quizSeed(now, 0))
    expect(quizSeed(now, 1)).not.toBe(quizSeed(now, 0))
  })
})
