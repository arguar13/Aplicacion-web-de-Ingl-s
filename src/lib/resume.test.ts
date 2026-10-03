import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRun,
  getResume,
  latestRun,
  parseResume,
  parseRunKey,
  rememberPractice,
  resetResume,
  runKey,
  runOf,
  type RunTarget,
  saveRun,
} from './resume'

const NOW = new Date(2026, 9, 2, 10).getTime()
const DAY = 24 * 60 * 60 * 1000
const LESSON: RunTarget = { kind: 'lesson', level: 'a2', lesson: 'presente-perfecto' }

beforeEach(() => resetResume())

describe('dónde lo dejaste', () => {
  it('cada tanda tiene su clave, y la clave vuelve a ser la tanda', () => {
    const targets: RunTarget[] = [
      LESSON,
      { kind: 'exam', level: 'c1' },
      { kind: 'quiz', level: 'b2' },
      { kind: 'quiz', level: null },
    ]
    for (const target of targets) expect(parseRunKey(runKey(target))).toEqual(target)
    expect(parseRunKey('z9/examen')).toBeNull()
    expect(parseRunKey('a1/MAL')).toBeNull()
    expect(parseRunKey('a1/x/y')).toBeNull()
  })

  it('guarda por dónde va una tanda, la retoma y la olvida al terminar', () => {
    saveRun(LESSON, { step: 'practice', index: 2, verdicts: ['correct', 'wrong'] }, NOW)
    expect(runOf(getResume(), LESSON)).toEqual({
      step: 'practice',
      index: 2,
      verdicts: ['correct', 'wrong'],
      at: NOW,
    })
    clearRun(LESSON)
    expect(runOf(getResume(), LESSON)).toBeNull()
  })

  it('lo más reciente del curso es lo que se ofrece continuar', () => {
    saveRun(LESSON, { step: 'read', index: 0, verdicts: [] }, NOW)
    saveRun({ kind: 'exam', level: 'a2' }, { step: 'practice', index: 5, verdicts: Array(5).fill('correct') }, NOW + 1)
    expect(latestRun(getResume())?.target).toEqual({ kind: 'exam', level: 'a2' })
  })

  it('anota la última práctica por tu cuenta', () => {
    rememberPractice('level-3', 'listen', NOW)
    expect(getResume().practice).toEqual({ deck: 'level-3', mode: 'listen', at: NOW })
  })

  it('descarta lo dañado, lo incoherente y lo de hace meses', () => {
    const parsed = parseResume(
      {
        practice: { deck: 'level-1', mode: 'volar', at: NOW },
        runs: {
          'a1/to-be': { step: 'practice', index: 1, verdicts: ['correct'], at: NOW },
          // Lo respondido no cuadra con el ejercicio en curso.
          'a1/articulos': { step: 'practice', index: 3, verdicts: ['correct'], at: NOW },
          'a1/viejo': { step: 'read', index: 0, verdicts: [], at: NOW - 90 * DAY },
          'x/y': { step: 'read', index: 0, verdicts: [], at: NOW },
          'quiz/mixto': { step: 'practice', index: 0, verdicts: [], seed: 42, at: NOW },
        },
      },
      NOW,
    )
    expect(parsed.practice).toBeNull()
    expect(Object.keys(parsed.runs).toSorted()).toEqual(['a1/to-be', 'quiz/mixto'])
    expect(parsed.runs['quiz/mixto'].seed).toBe(42)
  })
})
