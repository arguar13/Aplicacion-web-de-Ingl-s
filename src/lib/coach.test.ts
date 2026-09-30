import { beforeEach, describe, expect, it } from 'vitest'
import {
  assessLearner,
  coachOverview,
  FAST_JUMP,
  type Learner,
  LADDER,
  pickCoach,
  RUNG_STABILITY,
  WORKING_SET,
} from './coach'
import { ALL_WORDS } from './decks'
import { getEvents, type StudyEvent } from './events'
import { cardKey, EMPTY_PROGRESS, getProgress, type ProgressData, recordAnswer, resetProgress } from './progress'
import { advanceSession, type CardState, createSession, DAY, FAST_ANSWER_MS, REQUEUE_AFTER } from './scheduler'
import type { Track } from './types'

const NOW = new Date(2026, 8, 29, 10).getTime()
const NORMAL: Learner = { pace: 'normal', newAccuracy: null, fastShare: null, retention: null }
const FAST: Learner = { ...NORMAL, pace: 'fast' }
const first = () => 0
const rank = (id: string) => ALL_WORDS.findIndex((word) => word.id === id)

/** Tarjeta de repaso con la estabilidad y el vencimiento indicados. */
const card = (stability: number, due: number, phase: CardState['phase'] = 'review'): CardState => ({
  due,
  stability,
  difficulty: 5,
  phase,
  step: 0,
  reps: 3,
  lapses: 0,
  last: due - stability * DAY,
})

const withCards = (cards: Record<string, CardState>): ProgressData => ({ ...EMPTY_PROGRESS, cards })
const key = (track: Track, index: number) => cardKey(track, ALL_WORDS[index].id)

beforeEach(() => resetProgress())

describe('entrenador: qué toca en cada ronda', () => {
  it('sin progreso empieza por la palabra más frecuente, reconociéndola', () => {
    const pick = pickCoach(EMPTY_PROGRESS, createSession(), NOW, NORMAL, { allowNew: true }, first)
    expect(pick).toMatchObject({ word: ALL_WORDS[0], track: 'en-es', reason: 'new' })
  })

  it('los repasos vencidos van antes que lo nuevo, el de más riesgo primero', () => {
    const progress = withCards({
      [key('en-es', 0)]: card(10, NOW - DAY),
      [key('en-es', 1)]: card(2, NOW - DAY),
    })
    const pick = pickCoach(progress, createSession(), NOW, NORMAL, { allowNew: true }, first)
    expect(pick).toMatchObject({ word: ALL_WORDS[1], reason: 'review' })
  })

  it('lo fallado vuelve a salir a las pocas rondas de la misma sesión', () => {
    const session = createSession()
    advanceSession(session, key('es-en', 5), false)
    for (let i = 0; i < REQUEUE_AFTER; i++) advanceSession(session, key('en-es', 100 + i), true)
    const pick = pickCoach(EMPTY_PROGRESS, session, NOW, NORMAL, { allowNew: true }, first)
    expect(pick).toMatchObject({ word: ALL_WORDS[5], track: 'es-en', reason: 'relearn' })
  })

  it('una palabra afianzada sube de escalón: de reconocerla a recordarla', () => {
    const progress = withCards({ [key('en-es', 0)]: card(RUNG_STABILITY, NOW + 5 * DAY) })
    // Con subir de escalón y palabra nueva disponibles, se alternan: rng 0 elige subir.
    const pick = pickCoach(progress, createSession(), NOW, NORMAL, { allowNew: true }, first)
    expect(pick).toMatchObject({ word: ALL_WORDS[0], track: LADDER[1], reason: 'skill' })
  })

  it('sin cupo en el aprendizaje no introduce nada nuevo: practica lo más frágil', () => {
    const cards: Record<string, CardState> = {}
    for (let i = 0; i < WORKING_SET.normal; i++) cards[key('en-es', i)] = card(0.2, NOW + DAY, 'learning')
    const pick = pickCoach(withCards(cards), createSession(), NOW, NORMAL, { allowNew: true }, first)
    expect(pick.reason).toBe('practice')
  })

  it('al acelerar, la palabra nueva viene de más adelante en la lista (más difícil)', () => {
    const progress = withCards({ [key('en-es', 40)]: card(20, NOW + 10 * DAY) })
    // La palabra vista ya podría subir de escalón: un rng alto elige la nueva en la alternancia.
    const pick = pickCoach(progress, createSession(), NOW, FAST, { allowNew: true }, () => 0.99)
    expect(pick.reason).toBe('new')
    expect(rank(pick.word.id)).toBeGreaterThanOrEqual(40 + FAST_JUMP)
  })

  it('empieza las nuevas en el nivel que recomendó la prueba, y luego vuelve a las que faltan', () => {
    const fromLevel3 = pickCoach(
      EMPTY_PROGRESS,
      createSession(),
      NOW,
      NORMAL,
      { allowNew: true, startRank: 1000 },
      first,
    )
    expect(rank(fromLevel3.word.id)).toBe(1000)
    const cards: Record<string, CardState> = {}
    for (let i = 1000; i < ALL_WORDS.length; i++) cards[key('en-es', i)] = card(30, NOW + 30 * DAY)
    const back = pickCoach(
      withCards(cards),
      createSession(),
      NOW,
      NORMAL,
      { allowNew: true, startRank: 1000 },
      () => 0.99,
    )
    expect(rank(back.word.id)).toBe(0)
  })

  it('no repite la misma palabra dos rondas seguidas, ni en otra habilidad', () => {
    const session = createSession()
    advanceSession(session, key('en-es', 0), true)
    const progress = withCards({
      [key('es-en', 0)]: card(3, NOW - DAY),
      [key('en-es', 1)]: card(3, NOW - DAY),
    })
    expect(pickCoach(progress, session, NOW, NORMAL, { allowNew: true }, first).word).toBe(ALL_WORDS[1])
  })
})

/** `total` primeros encuentros con palabras nuevas, de los que `clean` se acertaron. */
const firsts = (clean: number, total: number, ms = 1200): StudyEvent[] =>
  Array.from({ length: total }, (_, i) => ({
    t: i,
    id: ALL_WORDS[i].id,
    track: 'en-es' as const,
    r: i < clean ? ('clean' as const) : ('miss' as const),
    ms,
    f: true as const,
  }))

describe('entrenador: cómo va el estudiante', () => {
  it('sin datos suficientes, ritmo normal', () => {
    expect(assessLearner(firsts(3, 3)).pace).toBe('normal')
  })

  it('acierta casi todas las nuevas y rápido: acelera', () => {
    expect(assessLearner(firsts(19, 20, 1000)).pace).toBe('fast')
  })

  it('acierta pocas nuevas: afianza', () => {
    expect(assessLearner(firsts(10, 20)).pace).toBe('steady')
  })

  it('acierta pero despacio: ritmo normal', () => {
    expect(assessLearner(firsts(20, 20, FAST_ANSWER_MS + 2000)).pace).toBe('normal')
  })
})

/**
 * Simula una sesión de `rounds` rondas con un estudiante que sabe las palabras hasta `knowsUpTo`
 * del ranking: las responde bien y rápido; las demás, mal. Devuelve la posición más lejana que
 * llegó a ver en la lista de frecuencia.
 */
function simulate(knowsUpTo: number, rounds: number): { furthest: number; relearned: number } {
  const session = createSession()
  let now = NOW
  let relearned = 0
  for (let i = 0; i < rounds; i++) {
    const learner = assessLearner(getEvents())
    const pick = pickCoach(getProgress(), session, now, learner, { allowNew: true })
    if (pick.reason === 'relearn') relearned++
    const clean = rank(pick.word.id) < knowsUpTo
    recordAnswer(
      pick.track,
      pick.word.id,
      { clean, ms: clean ? 900 : 6000, trusted: learner.pace === 'fast' && pick.reason === 'new' },
      now,
    )
    advanceSession(session, cardKey(pick.track, pick.word.id), clean)
    now += 8000
  }
  const seen = Object.keys(getProgress().cards).map((k) => rank(k.slice(k.indexOf(':') + 1)))
  return { furthest: Math.max(...seen), relearned }
}

/** Cada simulación son cientos de rondas reales (recorren el vocabulario y guardan el progreso). */
const SIMULATION_TIMEOUT = 30_000

describe('entrenador: se adapta a cada estudiante (simulación)', () => {
  it(
    'quien ya sabe mucho avanza mucho más lejos en la lista que quien empieza',
    () => {
      const advanced = simulate(3000, 150)
      resetProgress()
      const beginner = simulate(15, 150)
      expect(advanced.furthest).toBeGreaterThan(beginner.furthest * 4)
      expect(advanced.furthest).toBeGreaterThan(100)
    },
    SIMULATION_TIMEOUT,
  )

  it(
    'a quien falla, le vuelve a preguntar lo fallado en la sesión',
    () => {
      expect(simulate(0, 60).relearned).toBeGreaterThan(5)
    },
    SIMULATION_TIMEOUT,
  )
})

describe('resumen del entrenador', () => {
  it('cuenta lo que se reconoce, lo que vence hoy y lo que está en aprendizaje', () => {
    const progress = withCards({
      [key('en-es', 0)]: card(RUNG_STABILITY, NOW + 3 * DAY),
      [key('en-es', 1)]: card(1, NOW - DAY, 'relearning'),
      [key('es-en', 0)]: card(10, NOW - DAY),
    })
    expect(coachOverview(progress, NOW + 1000)).toEqual({ known: 1, cefr: 'A1', dueToday: 2, learning: 1 })
  })
})
