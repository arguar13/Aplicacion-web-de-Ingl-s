import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, evaluateAchievements, recordUnlocks, resetAchievements } from './achievements'
import { dayKey, EMPTY_PROGRESS, type ProgressData } from './progress'
import { fromLeitner } from './scheduler'

const NOW = new Date(2026, 8, 23, 10).getTime()
const DAY = 86_400_000
const day = (offset: number) => dayKey(NOW + offset * DAY)
const input = (progress: ProgressData, dailyGoal = 20) => ({ progress, dailyGoal, now: NOW })
const status = (id: string, progress: ProgressData) =>
  evaluateAchievements(input(progress), {}).find((s) => s.achievement.id === id)

describe('logros', () => {
  it('todos tienen id único', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
  })

  it('miden el avance hacia cada uno', () => {
    const progress: ProgressData = {
      ...EMPTY_PROGRESS,
      days: [day(-9), day(-8), day(-7), day(-6), day(-2), day(-1), day(0)],
      history: { [day(0)]: { answers: 25, clean: 20, fresh: 4, ms: 1 } },
      cards: { 'en-es:the': fromLeitner(5, NOW, 5, 0), 'listen:the': fromLeitner(2, NOW, 1, 0) },
      bestStreak: 12,
    }
    expect(status('first-word', progress)).toMatchObject({ unlocked: true })
    expect(status('daily-goal', progress)).toMatchObject({ unlocked: true })
    // La racha más larga (4 días) cuenta aunque la actual sea de 3.
    expect(status('streak-3', progress)).toMatchObject({ unlocked: true })
    expect(status('streak-7', progress)).toMatchObject({ value: 4, target: 7, unlocked: false })
    expect(status('mastered-10', progress)).toMatchObject({ value: 1, unlocked: false })
    expect(status('perfect-streak', progress)).toMatchObject({ value: 12, target: 25 })
    expect(status('all-skills', progress)).toMatchObject({ value: 2, target: 4 })
  })

  it('anuncia cada logro una sola vez', () => {
    resetAchievements()
    const progress: ProgressData = {
      ...EMPTY_PROGRESS,
      history: { [day(0)]: { answers: 1, clean: 1, fresh: 1, ms: 1 } },
    }
    expect(recordUnlocks(input(progress)).map((a) => a.id)).toEqual(['first-word'])
    expect(recordUnlocks(input(progress))).toEqual([])
  })
})
