import { Rating } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { dailyStreak, dayKey, migrateLeitnerToFsrs } from './progress'
import {
  advanceSession,
  type CardState,
  createSession,
  DAY,
  FAST_ANSWER_MS,
  fromLeitner,
  gradeAnswer,
  isMastered,
  MINUTE,
  parseCard,
  pickNext,
  previewIntervals,
  REQUEUE_AFTER,
  review,
  SLOW_ANSWER_MS,
  statusOf,
  summarize,
} from './scheduler'
import type { Word } from './types'

const NOW = new Date(2026, 8, 26, 12).getTime()
const words: Word[] = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, en: `en${i}`, es: `es${i}`, pos: 'noun' }))
const lookup = (cards: Record<string, CardState>) => (id: string) => cards[id]
/** Tarjeta en repaso con la estabilidad (días) indicada. */
const card = (stability: number, due: number): CardState => ({
  due,
  stability,
  difficulty: 5,
  phase: 'review',
  step: 0,
  reps: 3,
  lapses: 0,
  last: due - stability * DAY,
})
const FREQ = { newOrder: 'frequency' } as const

describe('nota de cada respuesta', () => {
  it('fallar es "otra vez"; lento, "difícil"; rápido en una conocida, "fácil"', () => {
    expect(gradeAnswer({ clean: false, ms: 900, isNew: false })).toBe(Rating.Again)
    expect(gradeAnswer({ clean: true, ms: SLOW_ANSWER_MS, isNew: false })).toBe(Rating.Hard)
    expect(gradeAnswer({ clean: true, ms: 4000, isNew: false })).toBe(Rating.Good)
    expect(gradeAnswer({ clean: true, ms: FAST_ANSWER_MS, isNew: false })).toBe(Rating.Easy)
  })

  it('escrita con un error de tecleo es "difícil", aunque sea rápida', () => {
    expect(gradeAnswer({ clean: true, almost: true, ms: 900, isNew: false })).toBe(Rating.Hard)
  })

  it('en tarjetas manda la nota que se pone el estudiante, tarde lo que tarde', () => {
    expect(gradeAnswer({ clean: true, ms: 100, isNew: true, rating: 'again' })).toBe(Rating.Again)
    expect(gradeAnswer({ clean: true, ms: 100, isNew: true, rating: 'hard' })).toBe(Rating.Hard)
    expect(gradeAnswer({ clean: true, ms: 100, isNew: true, rating: 'good' })).toBe(Rating.Good)
    expect(gradeAnswer({ clean: false, ms: 99_000, isNew: false, rating: 'easy' })).toBe(Rating.Easy)
  })

  it('la vista previa de intervalos crece de "otra vez" a "fácil" y coincide con el repaso real', () => {
    const known = card(10, NOW)
    const preview = previewIntervals(known, NOW)
    expect(preview.again).toBeLessThan(preview.hard)
    expect(preview.hard).toBeLessThan(preview.good)
    expect(preview.good).toBeLessThan(preview.easy)
    expect(preview.good).toBe(review(known, Rating.Good, NOW).due - NOW)
    // Una palabra nueva empieza por pasos cortos: "otra vez" vuelve en minutos.
    expect(previewIntervals(undefined, NOW).again).toBeLessThan(DAY)
  })

  it('una palabra nueva acertada rápido no salta a "fácil": podría ser suerte', () => {
    expect(gradeAnswer({ clean: true, ms: 800, isNew: true })).toBe(Rating.Good)
  })
})

describe('review (FSRS)', () => {
  it('una palabra nueva acertada vuelve a los pocos minutos para confirmarla', () => {
    const next = review(undefined, Rating.Good, NOW)
    expect(next.phase).toBe('learning')
    expect(next.due - NOW).toBeLessThanOrEqual(10 * MINUTE)
    expect(next.reps).toBe(1)
  })

  it('confirmarla la pasa a repaso con días de intervalo', () => {
    const learning = review(undefined, Rating.Good, NOW)
    const next = review(learning, Rating.Good, learning.due)
    expect(next.phase).toBe('review')
    expect(next.due - learning.due).toBeGreaterThanOrEqual(DAY)
  })

  it('acertar aleja el repaso, más cuanto más fácil; fallar lo acerca y cuenta un olvido', () => {
    const base = card(10, NOW)
    const hard = review(base, Rating.Hard, NOW)
    const good = review(base, Rating.Good, NOW)
    const easy = review(base, Rating.Easy, NOW)
    const again = review(base, Rating.Again, NOW)
    expect(hard.due).toBeLessThan(good.due)
    expect(good.due).toBeLessThan(easy.due)
    expect(good.stability).toBeGreaterThan(base.stability)
    expect(again.due - NOW).toBeLessThan(DAY)
    expect(again.lapses).toBe(1)
    expect(again.phase).toBe('relearning')
  })

  it('el mismo historial da siempre el mismo calendario', () => {
    expect(review(card(5, NOW), Rating.Good, NOW)).toEqual(review(card(5, NOW), Rating.Good, NOW))
  })
})

describe('migración desde Leitner', () => {
  it('conserva la fecha de repaso y convierte la caja en estabilidad', () => {
    expect(fromLeitner(4, NOW, 5, 1)).toMatchObject({ due: NOW, stability: 7, phase: 'review', reps: 5, lapses: 1 })
    expect(fromLeitner(1, NOW, 2, 0)).toMatchObject({ due: NOW, phase: 'learning' })
    expect(fromLeitner(1, NOW, 3, 2)).toMatchObject({ phase: 'relearning', lapses: 2 })
  })

  it('las dominadas siguen siendo las mismas (caja 4 o más)', () => {
    for (let box = 1; box <= 6; box++) {
      expect(isMastered(fromLeitner(box, NOW, 3, 0))).toBe(box >= 4)
    }
  })

  it('migra el progreso v1 entero y descarta lo que no tiene forma de tarjeta', () => {
    const migrated = migrateLeitnerToFsrs({
      cards: { 'en-es:the': { box: 5, due: NOW, seen: 4, lapses: 0 }, 'en-es:mal': { box: 'x' } },
      days: ['2026-09-26'],
    })
    expect(migrated.cards).toEqual({ 'en-es:the': fromLeitner(5, NOW, 4, 0) })
    expect(migrated.days).toEqual(['2026-09-26'])
  })

  it('las tarjetas migradas son válidas', () => {
    for (let box = 1; box <= 6; box++) expect(parseCard(fromLeitner(box, NOW, 3, 1))).not.toBeNull()
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
    expect(pickNext(words, lookup({}), session, NOW, FREQ).word.id).not.toBe('w0')
  })

  it('los repasos vencidos van antes que las palabras nuevas', () => {
    const cards = { w8: card(2, NOW - 1), w9: card(2, NOW + DAY) }
    expect(pickNext(words, lookup(cards), createSession(), NOW, FREQ)).toEqual({ word: words[8], reason: 'review' })
  })

  it('introduce las nuevas por orden de frecuencia', () => {
    for (let i = 0; i < 30; i++) {
      const pick = pickNext(words, lookup({}), createSession(), NOW, FREQ)
      expect(pick.reason).toBe('new')
      expect(['w0', 'w1', 'w2']).toContain(pick.word.id)
    }
  })

  it('con el límite diario de nuevas alcanzado, practica lo ya visto', () => {
    const cards = { w0: card(1, NOW + DAY), w1: card(30, NOW + DAY) }
    for (let i = 0; i < 50; i++) {
      const pick = pickNext(words, lookup(cards), createSession(), NOW, { ...FREQ, allowNew: false })
      expect(pick.reason).toBe('practice')
      expect(['w0', 'w1']).toContain(pick.word.id)
    }
  })

  it('nunca repite seguidas las últimas palabras mostradas (propiedad, 300 sesiones al azar)', () => {
    for (let run = 0; run < 300; run++) {
      const session = createSession()
      const cards: Record<string, CardState> = {}
      let previous = ''
      for (let round = 0; round < 12; round++) {
        const { word } = pickNext(words, lookup(cards), session, NOW + round * MINUTE, FREQ)
        expect(word.id).not.toBe(previous)
        const clean = Math.random() > 0.3
        cards[word.id] = review(cards[word.id], clean ? Rating.Good : Rating.Again, NOW + round * MINUTE)
        advanceSession(session, word.id, clean)
        previous = word.id
      }
    }
  })

  it('con todo visto y al día, practica favoreciendo las más frágiles', () => {
    const cards = Object.fromEntries(words.map((w) => [w.id, card(w.id === 'w7' ? 0.5 : 60, NOW + DAY)]))
    const picks = Array.from({ length: 200 }, () => pickNext(words, lookup(cards), createSession(), NOW, FREQ))
    expect(picks.every((p) => p.reason === 'practice')).toBe(true)
    expect(picks.filter((p) => p.word.id === 'w7').length).toBeGreaterThan(50)
  })
})

describe('summarize', () => {
  it('cuenta nuevas, aprendiendo, dominadas y vencidas', () => {
    const cards = { w0: card(1, NOW - 1), w1: card(7, NOW + DAY), w2: card(30, NOW - 1) }
    expect(summarize(words, lookup(cards), NOW)).toEqual({ total: 10, fresh: 7, learning: 1, mastered: 2, due: 2 })
    expect(statusOf(undefined)).toBe('new')
  })
})

const day = (offset: number) => dayKey(NOW + offset * DAY)

describe('dailyStreak', () => {
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
