import { describe, expect, it } from 'vitest'
import { dailyStreak, dayKey } from './progress'
import {
  advanceSession,
  type CardState,
  createSession,
  DAY,
  INTERVALS,
  MAX_BOX,
  pickNext,
  REQUEUE_AFTER,
  review,
  summarize,
} from './scheduler'
import type { Word } from './types'

const NOW = new Date(2026, 8, 26, 12).getTime()
const words: Word[] = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, en: `en${i}`, es: `es${i}` }))
const lookup = (cards: Record<string, CardState>) => (id: string) => cards[id]
const card = (box: number, due: number): CardState => ({ box, due, seen: 1, lapses: 0 })
const FREQ = { newOrder: 'frequency' } as const

describe('review', () => {
  it('una palabra nueva acertada a la primera salta a un día', () => {
    expect(review(undefined, true, NOW)).toEqual({ box: 2, due: NOW + DAY, seen: 1, lapses: 0 })
  })

  it('acertar sube una caja y fallar vuelve a la caja 1', () => {
    expect(review(card(3, 0), true, NOW)).toMatchObject({ box: 4, due: NOW + INTERVALS[4] })
    expect(review(card(5, 0), false, NOW)).toMatchObject({ box: 1, due: NOW + INTERVALS[1], lapses: 1 })
    expect(review(card(MAX_BOX, 0), true, NOW).box).toBe(MAX_BOX)
  })
})

describe('pickNext', () => {
  it('prioriza lo fallado en la sesión cuando ya le toca', () => {
    const session = createSession()
    advanceSession(session, 'w5', false)
    for (let i = 0; i < REQUEUE_AFTER; i++) advanceSession(session, `w${i}`, true)
    expect(pickNext(words, lookup({}), session, NOW, FREQ)).toEqual({ word: words[5], reason: 'relearn' })
  })

  it('no repite lo fallado antes de tiempo', () => {
    const session = createSession()
    advanceSession(session, 'w0', false)
    const pick = pickNext(words, lookup({}), session, NOW, FREQ)
    expect(pick.word.id).not.toBe('w0')
  })

  it('los repasos vencidos van antes que las palabras nuevas', () => {
    const cards = { w8: card(2, NOW - 1), w9: card(2, NOW + DAY) }
    const pick = pickNext(words, lookup(cards), createSession(), NOW, FREQ)
    expect(pick).toEqual({ word: words[8], reason: 'review' })
  })

  it('introduce las nuevas por orden de frecuencia', () => {
    for (let i = 0; i < 30; i++) {
      const pick = pickNext(words, lookup({}), createSession(), NOW, FREQ)
      expect(pick.reason).toBe('new')
      expect(['w0', 'w1', 'w2']).toContain(pick.word.id)
    }
  })

  it('evita repetir las últimas palabras mostradas', () => {
    const session = createSession()
    for (const id of ['w0', 'w1', 'w2']) advanceSession(session, id, true)
    const cards = Object.fromEntries(['w0', 'w1', 'w2'].map((id) => [id, card(2, NOW - 1)]))
    for (let i = 0; i < 50; i++) {
      // Aunque w0–w2 tienen el repaso vencido, se acaban de ver: sale una nueva.
      expect(['w3', 'w4', 'w5']).toContain(pickNext(words, lookup(cards), session, NOW, FREQ).word.id)
    }
  })

  it('con todo visto y al día, practica favoreciendo las cajas bajas', () => {
    const cards = Object.fromEntries(words.map((w) => [w.id, card(w.id === 'w7' ? 1 : 6, NOW + DAY)]))
    const picks = Array.from({ length: 200 }, () => pickNext(words, lookup(cards), createSession(), NOW, FREQ))
    expect(picks.every((p) => p.reason === 'practice')).toBe(true)
    expect(picks.filter((p) => p.word.id === 'w7').length).toBeGreaterThan(50)
  })
})

describe('summarize', () => {
  it('cuenta nuevas, aprendiendo, dominadas y vencidas', () => {
    const cards = { w0: card(1, NOW - 1), w1: card(4, NOW + DAY), w2: card(6, NOW - 1) }
    expect(summarize(words, lookup(cards), NOW)).toEqual({ total: 10, fresh: 7, learning: 1, mastered: 2, due: 2 })
  })
})

describe('dailyStreak', () => {
  const day = (offset: number) => dayKey(NOW + offset * DAY)

  it('cuenta los días seguidos hasta hoy', () => {
    expect(dailyStreak([day(-2), day(-1), day(0)], NOW)).toBe(3)
  })

  it('si hoy aún no practicaste, la racha sigue viva desde ayer', () => {
    expect(dailyStreak([day(-3), day(-2), day(-1)], NOW)).toBe(3)
  })

  it('un día sin práctica corta la racha', () => {
    expect(dailyStreak([day(-4), day(-2)], NOW)).toBe(0)
    expect(dailyStreak([], NOW)).toBe(0)
  })
})
