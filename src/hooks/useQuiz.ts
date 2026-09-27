import { useEffect, useRef, useState } from 'react'
import { playPronunciation, preloadPronunciation } from '@/lib/audio'
import { type Deck, distractorPool } from '@/lib/decks'
import { cardLookup, getProgress, recordAnswer, recordStreak, todayStats } from '@/lib/progress'
import { buildOptions } from '@/lib/quiz'
import { advanceSession, createSession, isMastered, pickNext, type Session } from '@/lib/scheduler'
import { feedback } from '@/lib/feedback'
import { getSettings } from '@/lib/settings'
import { type Mode, type Round, type Track, trackOf, type Word } from '@/lib/types'
import { judgeTyped, type TypedVerdict } from '@/lib/typing'

/** Tiempo que se muestra el acierto antes de pasar a la siguiente palabra. */
const ADVANCE_DELAY_MS = 850
/** Cuando la pronunciación suena al acertar, se deja un poco más para oírla. */
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

/** Por qué se muestra el resumen: se completó el nivel, se cumplió la meta del día o se quiere salir. */
export type SummaryReason = 'level' | 'goal' | 'exit'

const EMPTY_STATS: QuizStats = { solved: 0, firstTry: 0, streak: 0, bestStreak: 0, fresh: 0, missed: [] }

interface State {
  round: Round
  /** Siguiente ronda, ya calculada mientras se muestra el acierto. */
  next: Round | null
  /** Ids de las teclas que el usuario ya pulsó mal en esta ronda. */
  wrong: string[]
  /** Modo escribir: lo que se escribió y cómo se juzgó. */
  typed: { text: string; verdict: TypedVerdict } | null
  solved: boolean
  /** Tras responder, la partida se detiene con el detalle de la palabra a la vista. */
  expanded: boolean
  /** Esta respuesta completó la meta del día: al avanzar se muestra el resumen. */
  goalReached: boolean
  /** Esta respuesta dejó dominadas todas las palabras del nivel: al avanzar se celebra. */
  levelDone: boolean
  /** Resumen de la sesión a la vista (la partida está detenida). */
  summary: SummaryReason | null
  stats: QuizStats
}

/** Modos en que la palabra suena al aparecer: la pregunta es la palabra inglesa, oída o leída. */
const soundsOnShow = (mode: Mode) => mode === 'en-es' || mode === 'listen'

function nextRound(deck: Deck, mode: Mode, session: Session): Round {
  const progress = getProgress()
  const now = Date.now()
  const { newPerDay } = getSettings()
  const allowNew = newPerDay === 0 || todayStats(progress, now).fresh < newPerDay
  const pick = pickNext(deck.words, cardLookup(progress, trackOf(mode)), session, now, {
    newOrder: deck.newOrder,
    allowNew,
  })
  // En escribir no hay teclas: la respuesta se escribe.
  const options = mode === 'type' ? [] : buildOptions(pick.word, distractorPool(deck, pick.word))
  return { ...pick, options }
}

/** Falladas de la sesión con `word` añadida (una sola vez). */
const missedWith = (stats: QuizStats, word: Word) =>
  stats.missed.some((w) => w.id === word.id) ? stats.missed : [...stats.missed, word]

/** Todas las palabras del mazo dominadas en esa habilidad. */
const deckMastered = (deck: Deck, track: Track) => {
  const lookup = cardLookup(getProgress(), track)
  return deck.words.every((word) => {
    const card = lookup(word.id)
    return card !== undefined && isMastered(card)
  })
}

const withNext = (s: State): State =>
  s.next ? { ...s, round: s.next, next: null, wrong: [], typed: null, solved: false, expanded: false } : s

export function useQuiz(deck: Deck, mode: Mode) {
  const track = trackOf(mode)
  // Objeto mutable de la sesión: no se pinta, solo alimenta al planificador.
  const [session] = useState(createSession)
  const [state, setState] = useState<State>(() => ({
    round: nextRound(deck, mode, session),
    next: null,
    wrong: [],
    typed: null,
    solved: false,
    expanded: false,
    goalReached: false,
    levelDone: false,
    summary: null,
    stats: EMPTY_STATS,
  }))
  // Evita registrar dos veces un acierto si llegan dos toques antes de volver a pintar.
  const resolving = useRef(false)
  // Momento en que apareció la palabra: lo que se tarda en acertar afina el repaso espaciado.
  const shownAt = useRef(0)
  const onShow = soundsOnShow(mode)
  // Si la pregunta no es la palabra inglesa, sonar antes delataría la respuesta: suena al acertar.
  const canReplay = onShow || state.solved

  useEffect(() => {
    shownAt.current = performance.now()
  }, [state.round])

  useEffect(() => {
    // En escuchar, el audio es la pregunta: suena aunque la pronunciación automática esté apagada.
    if (mode === 'listen' || (onShow && getSettings().autoplay)) void playPronunciation(state.round.word.id)
    else preloadPronunciation(state.round.word.id)
  }, [state.round, mode, onShow])

  useEffect(() => {
    if (state.solved && !onShow && getSettings().autoplay) void playPronunciation(state.round.word.id)
  }, [state.solved, state.round, onShow])

  useEffect(() => {
    if (state.next) preloadPronunciation(state.next.word.id)
  }, [state.next])

  useEffect(() => {
    // Avance automático solo con la ronda resuelta y nada abierto (ni detalle ni resumen).
    if (!state.solved || state.expanded || state.summary) return
    const timer = setTimeout(advance, onShow ? ADVANCE_DELAY_MS : ADVANCE_DELAY_WITH_AUDIO_MS)
    return () => clearTimeout(timer)
  }, [state.solved, state.expanded, state.summary, onShow])

  /** Pasa a la siguiente palabra, o al resumen si esta respuesta completó la meta del día. */
  function advance() {
    setState((s) => {
      if (!s.solved || !s.next) return s
      // Completar un nivel es más raro (y más grande) que la meta del día: se celebra primero.
      if (s.levelDone) return { ...s, levelDone: false, goalReached: false, expanded: false, summary: 'level' }
      if (s.goalReached) return { ...s, goalReached: false, expanded: false, summary: 'goal' }
      resolving.current = false
      return withNext(s)
    })
  }

  /** Sale del resumen y sigue con la siguiente palabra. */
  function resume() {
    resolving.current = false
    setState((s) => ({ ...withNext(s), summary: null }))
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

  /**
   * Cierra la ronda: registra la respuesta, avanza la sesión, calcula la siguiente palabra y decide
   * si la partida se detiene para mostrar el detalle.
   */
  function solve(clean: boolean, extra: Partial<State> = {}, { almost = false } = {}) {
    const { round, stats } = state
    resolving.current = true
    const isNew = !cardLookup(getProgress(), track)(round.word.id)
    const { dailyGoal, detailsPause } = getSettings()
    const answeredBefore = todayStats(getProgress()).answers
    const levelWasDone = deck.kind === 'level' && deckMastered(deck, track)
    recordAnswer(track, round.word.id, { clean, almost, ms: performance.now() - shownAt.current })
    feedback(clean ? 'correct' : 'wrong')
    advanceSession(session, round.word.id, clean)
    const streak = clean ? stats.streak + 1 : 0
    recordStreak(streak)
    setState({
      ...state,
      ...extra,
      solved: true,
      // Tras un fallo es cuando más ayuda ver el ejemplo; quien va rápido no se detiene.
      expanded: detailsPause === 'always' || (detailsPause === 'mistakes' && !clean),
      next: nextRound(deck, mode, session),
      goalReached: answeredBefore < dailyGoal && answeredBefore + 1 >= dailyGoal,
      levelDone: deck.kind === 'level' && !levelWasDone && deckMastered(deck, track),
      stats: {
        ...stats,
        solved: stats.solved + 1,
        firstTry: stats.firstTry + (clean ? 1 : 0),
        streak,
        bestStreak: Math.max(stats.bestStreak, streak),
        fresh: stats.fresh + (isNew ? 1 : 0),
        missed: clean ? stats.missed : missedWith(stats, round.word),
      },
    })
  }

  /** Pulsar una tecla de respuesta. */
  function answer(id: string) {
    const { round, wrong, solved, stats } = state
    if (resolving.current || solved || wrong.includes(id)) return
    if (id !== round.word.id) {
      feedback('wrong')
      setState({
        ...state,
        wrong: [...wrong, id],
        stats: { ...stats, streak: 0, missed: missedWith(stats, round.word) },
      })
      return
    }
    solve(wrong.length === 0)
  }

  /**
   * Modo escribir: exacta o "casi" (un error de tecleo) cuentan como acierto, "casi" con nota más
   * baja; incorrecta muestra la respuesta y cuenta como fallo.
   */
  function submitTyped(text: string) {
    if (resolving.current || state.solved || !text.trim()) return
    const verdict = judgeTyped(text, state.round.word.en)
    solve(verdict !== 'wrong', { typed: { text, verdict } }, { almost: verdict === 'almost' })
  }

  function replay({ slow = false }: { slow?: boolean } = {}) {
    if (canReplay) void playPronunciation(state.round.word.id, { slow })
  }

  return { ...state, canReplay, answer, submitTyped, replay, expand, advance, resume, requestExit }
}
