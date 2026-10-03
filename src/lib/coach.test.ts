import { beforeEach, describe, expect, it } from 'vitest'
import {
  assessLearner,
  coachFrontier,
  coachOverview,
  LEARN_AHEAD_MS,
  type Learner,
  LADDER,
  pickCoach,
  REVIEWS_BETWEEN_NEW,
  RUNG_STABILITY,
  topBy,
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

  it('sin cupo, adelanta lo que se está aprendiendo y vence pronto, no lo ya dominado', () => {
    const cards: Record<string, CardState> = {}
    // Cientos de palabras dominadas y el aprendizaje lleno, con una que vence en unos minutos.
    for (let i = 100; i < 600; i++) cards[key('en-es', i)] = card(40, NOW + 30 * DAY)
    for (let i = 0; i < WORKING_SET.normal; i++) cards[key('en-es', i)] = card(0.2, NOW + DAY, 'learning')
    cards[key('en-es', 3)] = card(0.2, NOW + LEARN_AHEAD_MS / 2, 'learning')
    const pick = pickCoach(withCards(cards), createSession(), NOW, NORMAL, { allowNew: true }, first)
    expect(pick).toMatchObject({ word: ALL_WORDS[3], reason: 'learning' })
  })

  it('en la práctica libre no vuelve a lo dominado mientras haya algo por afianzar', () => {
    const cards: Record<string, CardState> = {}
    // Quinientas dominadas en las cuatro habilidades (ni repasos ni escalones por subir) y una frágil.
    for (let i = 0; i < 500; i++) for (const track of LADDER) cards[key(track, i)] = card(40, NOW + 30 * DAY)
    cards[key('en-es', 700)] = card(2, NOW + 2 * DAY)
    for (let attempt = 0; attempt < 20; attempt++) {
      const pick = pickCoach(withCards(cards), createSession(), NOW, NORMAL, { allowNew: false }, Math.random)
      expect(pick).toMatchObject({ word: ALL_WORDS[700], reason: 'practice' })
    }
  })

  it('con una pila de repasos, cada pocos entra una palabra nueva: la sesión siempre avanza', () => {
    const cards: Record<string, CardState> = {}
    for (let i = 0; i < 300; i++) cards[key('en-es', i)] = card(10, NOW - DAY)
    const session = createSession()
    const reasons: string[] = []
    for (let round = 0; round < 12; round++) {
      const pick = pickCoach(withCards(cards), session, NOW, NORMAL, { allowNew: true }, first)
      reasons.push(pick.reason)
      const introduced = pick.reason === 'new' || pick.reason === 'skill'
      advanceSession(session, cardKey(pick.track, pick.word.id), true, introduced)
    }
    // La sesión abre con repasos, y lo nuevo (palabras o habilidades) entra cada pocos.
    expect(reasons.slice(0, REVIEWS_BETWEEN_NEW.normal)).toEqual(Array(REVIEWS_BETWEEN_NEW.normal).fill('review'))
    const fresh = reasons.filter((reason) => reason === 'new' || reason === 'skill').length
    expect(fresh).toBeGreaterThanOrEqual(Math.floor(12 / (REVIEWS_BETWEEN_NEW.normal + 1)))
    expect(reasons.filter((reason) => reason === 'review').length).toBeGreaterThan(fresh)
  })

  it('el recorrido es secuencial también al acelerar: la nueva es la siguiente de la lista', () => {
    const cards: Record<string, CardState> = {}
    for (let i = 0; i < 40; i++) cards[key('en-es', i)] = card(2, NOW + 10 * DAY)
    // Una palabra suelta de mucho más adelante (p. ej. practicada en un nivel alto) no hace saltar.
    cards[key('en-es', 3000)] = card(20, NOW + 10 * DAY)
    const pick = pickCoach(withCards(cards), createSession(), NOW, FAST, { allowNew: true }, () => 0.99)
    expect(pick).toMatchObject({ word: ALL_WORDS[40], reason: 'new' })
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
    advanceSession(session, cardKey(pick.track, pick.word.id), clean, pick.reason === 'new' || pick.reason === 'skill')
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

describe('recorrido secuencial', () => {
  it('dice por qué palabra va y cuántas se vieron, desde el nivel de partida', () => {
    const progress = withCards({ [key('en-es', 0)]: card(2, NOW), [key('en-es', 1)]: card(2, NOW) })
    expect(coachFrontier(progress)).toEqual({ rank: 2, seen: 2 })
    expect(coachFrontier(progress, 1000)).toEqual({ rank: 1000, seen: 2 })
    expect(coachFrontier(EMPTY_PROGRESS)).toEqual({ rank: 0, seen: 0 })
  })
})

describe('los más urgentes sin ordenar todo', () => {
  it('devuelve los k de mayor puntuación, en orden', () => {
    expect(topBy([5, 1, 9, 3, 7, 9], (n) => n, 3)).toEqual([9, 9, 7])
    expect(topBy([2, 1], (n) => -n, 3)).toEqual([1, 2])
    expect(topBy([], (n: number) => n, 2)).toEqual([])
  })
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
