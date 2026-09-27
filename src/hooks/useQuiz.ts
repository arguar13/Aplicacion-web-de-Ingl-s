import { useEffect, useRef, useState } from 'react'
import { playPronunciation, preloadPronunciation } from '@/lib/audio'
import { type Deck, distractorPool } from '@/lib/decks'
import { cardLookup, getProgress, recordAnswer, recordStreak, todayStats } from '@/lib/progress'
import { buildOptions } from '@/lib/quiz'
import { advanceSession, createSession, pickNext, type Session } from '@/lib/scheduler'
import { getSettings } from '@/lib/settings'
import type { Direction, Round, Word } from '@/lib/types'

/** Tiempo que se muestra el acierto antes de pasar a la siguiente palabra. */
const ADVANCE_DELAY_MS = 850
/** En español → inglés la pronunciación suena al acertar: se deja un poco más para oírla. */
const ADVANCE_DELAY_WITH_AUDIO_MS = 1300

export interface QuizStats {
  /** Palabras resueltas en esta sesión. */
  solved: number
  /** Palabras resueltas sin fallar. */
  firstTry: number
  streak: number
  /** Mejor racha de la sesión. */
  bestStreak: number
  /** Palabras nuevas vistas en esta sesión. */
  fresh: number
  /** Palabras falladas alguna vez en la sesión, sin repetir, en el orden en que se fallaron. */
  missed: Word[]
}

/** Por qué se muestra el resumen: se cumplió la meta del día o el usuario quiere salir. */
export type SummaryReason = 'goal' | 'exit'

const EMPTY_STATS: QuizStats = { solved: 0, firstTry: 0, streak: 0, bestStreak: 0, fresh: 0, missed: [] }

interface State {
  round: Round
  /** Siguiente ronda, ya calculada mientras se muestra el acierto. */
  next: Round | null
  /** Ids de las teclas que el usuario ya pulsó mal en esta ronda. */
  wrong: string[]
  solved: boolean
  /** Tras responder, la partida se detiene con el detalle de la palabra a la vista. */
  expanded: boolean
  /** Esta respuesta completó la meta del día: al avanzar se muestra el resumen. */
  goalReached: boolean
  /** Resumen de la sesión a la vista (la partida está detenida). */
  summary: SummaryReason | null
  stats: QuizStats
}

function nextRound(deck: Deck, direction: Direction, session: Session): Round {
  const progress = getProgress()
  const now = Date.now()
  const { newPerDay } = getSettings()
  const allowNew = newPerDay === 0 || todayStats(progress, now).fresh < newPerDay
  const pick = pickNext(deck.words, cardLookup(progress, direction), session, now, {
    newOrder: deck.newOrder,
    allowNew,
  })
  return { ...pick, options: buildOptions(pick.word, distractorPool(deck, pick.word)) }
}

export function useQuiz(deck: Deck, direction: Direction) {
  // Objeto mutable de la sesión: no se pinta, solo alimenta al planificador.
  const [session] = useState(createSession)
  const [state, setState] = useState<State>(() => ({
    round: nextRound(deck, direction, session),
    next: null,
    wrong: [],
    solved: false,
    expanded: false,
    goalReached: false,
    summary: null,
    stats: EMPTY_STATS,
  }))
  // Evita registrar dos veces un acierto si llegan dos toques antes de volver a pintar.
  const resolving = useRef(false)
  // Momento en que apareció la palabra: lo que se tarda en acertar afina el repaso espaciado.
  const shownAt = useRef(0)
  // Inglés → español: suena al aparecer. Español → inglés: sonar antes delataría la respuesta,
  // así que suena al acertar.
  const promptIsEnglish = direction === 'en-es'
  const canReplay = promptIsEnglish || state.solved

  useEffect(() => {
    shownAt.current = performance.now()
  }, [state.round])

  useEffect(() => {
    if (promptIsEnglish && getSettings().autoplay) void playPronunciation(state.round.word.id)
    else preloadPronunciation(state.round.word.id)
  }, [state.round, promptIsEnglish])

  useEffect(() => {
    if (state.solved && !promptIsEnglish && getSettings().autoplay) void playPronunciation(state.round.word.id)
  }, [state.solved, state.round, promptIsEnglish])

  useEffect(() => {
    if (state.next) preloadPronunciation(state.next.word.id)
  }, [state.next])

  useEffect(() => {
    // Avance automático solo con la ronda resuelta y nada abierto (ni detalle ni resumen).
    if (!state.solved || state.expanded || state.summary) return
    const timer = setTimeout(advance, promptIsEnglish ? ADVANCE_DELAY_MS : ADVANCE_DELAY_WITH_AUDIO_MS)
    return () => clearTimeout(timer)
  }, [state.solved, state.expanded, state.summary, promptIsEnglish])

  /** Pasa a la siguiente palabra (ya calculada al acertar). */
  /** Pasa a la siguiente palabra, o al resumen si esta respuesta completó la meta del día. */
  function advance() {
    setState((s) => {
      if (!s.solved || !s.next) return s
      if (s.goalReached) return { ...s, goalReached: false, expanded: false, summary: 'goal' }
      resolving.current = false
      return { ...s, round: s.next, next: null, wrong: [], solved: false, expanded: false }
    })
  }

  /** Sale del resumen y sigue con la siguiente palabra. */
  function resume() {
    resolving.current = false
    setState((s) =>
      s.next
        ? { ...s, round: s.next, next: null, wrong: [], solved: false, expanded: false, summary: null }
        : { ...s, summary: null },
    )
  }

  /**
   * El usuario quiere salir. Si respondió algo, primero ve el resumen de la sesión (devuelve true);
   * si no, puede salir directamente (devuelve false).
   */
  function requestExit(): boolean {
    if (state.stats.solved === 0 || state.summary) return false
    setState({ ...state, summary: 'exit' })
    return true
  }

  /** Detiene el avance automático para ver el detalle de la palabra recién resuelta. */
  function expand() {
    setState((s) => (s.solved ? { ...s, expanded: true } : s))
  }

  function answer(id: string) {
    const { round, wrong, solved, stats } = state
    if (resolving.current || solved || wrong.includes(id)) return

    if (id !== round.word.id) {
      const missed = stats.missed.some((w) => w.id === round.word.id) ? stats.missed : [...stats.missed, round.word]
      setState({ ...state, wrong: [...wrong, id], stats: { ...stats, streak: 0, missed } })
      return
    }

    resolving.current = true
    const clean = wrong.length === 0
    const isNew = !cardLookup(getProgress(), direction)(round.word.id)
    const { dailyGoal } = getSettings()
    const answeredBefore = todayStats(getProgress()).answers
    recordAnswer(direction, round.word.id, { clean, ms: performance.now() - shownAt.current })
    advanceSession(session, round.word.id, clean)
    const streak = clean ? stats.streak + 1 : 0
    recordStreak(streak)
    const pause = getSettings().detailsPause
    setState({
      ...state,
      solved: true,
      // Tras un fallo es cuando más ayuda ver el ejemplo; quien va rápido no se detiene.
      expanded: pause === 'always' || (pause === 'mistakes' && !clean),
      next: nextRound(deck, direction, session),
      goalReached: answeredBefore < dailyGoal && answeredBefore + 1 >= dailyGoal,
      stats: {
        ...stats,
        solved: stats.solved + 1,
        firstTry: stats.firstTry + (clean ? 1 : 0),
        streak,
        bestStreak: Math.max(stats.bestStreak, streak),
        fresh: stats.fresh + (isNew ? 1 : 0),
      },
    })
  }

  function replay({ slow = false }: { slow?: boolean } = {}) {
    if (canReplay) void playPronunciation(state.round.word.id, { slow })
  }

  return { ...state, canReplay, answer, replay, expand, advance, resume, requestExit }
}
