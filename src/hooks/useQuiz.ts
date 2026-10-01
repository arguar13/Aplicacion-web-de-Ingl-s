import { useEffect, useRef, useState } from 'react'
import { playPronunciation, preloadPronunciation } from '@/lib/audio'
import { assessLearner, modeOf, pickCoach } from '@/lib/coach'
import { type Deck, distractorPool, LEVEL_SIZE } from '@/lib/decks'
import { getEvents } from '@/lib/events'
import {
  type Answer,
  answerFromRating,
  cardKey,
  cardLookup,
  getProgress,
  type ProgressData,
  recordAnswer,
  recordStreak,
  todayStats,
} from '@/lib/progress'
import { buildOptions, CONFUSABLE_STABILITY } from '@/lib/quiz'
import {
  advanceSession,
  createSession,
  isMastered,
  pickNext,
  type PickReason,
  type SelfRating,
  type Session,
} from '@/lib/scheduler'
import { feedback } from '@/lib/feedback'
import { getSettings } from '@/lib/settings'
import { isTypedMode, type Mode, type Round, type Track, trackOf, type Word } from '@/lib/types'
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

/**
 * Por qué se muestra el resumen: se completó el nivel, se cumplió la meta del día, se acabó el tiempo
 * del modo concentración o se quiere salir.
 */
export type SummaryReason = 'level' | 'goal' | 'time' | 'exit'

const EMPTY_STATS: QuizStats = { solved: 0, firstTry: 0, streak: 0, bestStreak: 0, fresh: 0, missed: [] }

interface State {
  round: Round
  /** Siguiente ronda, ya calculada mientras se muestra el acierto. */
  next: Round | null
  /** Ids de las teclas que el usuario ya pulsó mal en esta ronda. */
  wrong: string[]
  /** Modo escribir: lo que se escribió, cómo se juzgó y si se pidió una pista. */
  typed: { text: string; verdict: TypedVerdict; hinted: boolean } | null
  /** Modo tarjetas: la traducción ya está a la vista, falta calificarse. */
  revealed: boolean
  /** Modo tarjetas: la nota que se puso el estudiante. */
  rating: SelfRating | null
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
const soundsOnShow = (mode: Mode) => mode === 'en-es' || mode === 'listen' || mode === 'flash' || mode === 'dictation'
/** Modos en que el audio es la pregunta: suena aunque la pronunciación automática esté apagada. */
const audioIsPrompt = (mode: Mode) => mode === 'listen' || mode === 'dictation'

/**
 * La siguiente ronda. En la sesión inteligente la decide el entrenador (palabra y modo); en los
 * demás mazos, el planificador con el modo elegido.
 */
function nextRound(deck: Deck, mode: Mode, session: Session): Round {
  const progress = getProgress()
  const now = Date.now()
  const { newPerDay } = getSettings()
  const allowNew = newPerDay === 0 || todayStats(progress, now).fresh < newPerDay
  if (deck.kind === 'coach') {
    const learner = assessLearner(getEvents())
    const startRank = (getSettings().startLevel - 1) * LEVEL_SIZE
    const pick = pickCoach(progress, session, now, learner, { allowNew, startRank })
    const trusted = learner.pace === 'fast' && pick.reason === 'new'
    return buildRound(deck, pick.word, modeOf(pick.track), pick.reason, progress, trusted)
  }
  const pick = pickNext(deck.words, cardLookup(progress, trackOf(mode)), session, now, {
    newOrder: deck.newOrder,
    allowNew,
  })
  return buildRound(deck, pick.word, mode, pick.reason, progress, false)
}

function buildRound(
  deck: Deck,
  word: Word,
  mode: Mode,
  reason: PickReason,
  progress: ProgressData,
  trusted: boolean,
): Round {
  // Con la palabra ya afianzada, distractores parecidos: sigue exigiendo atención.
  const card = progress.cards[cardKey(trackOf(mode), word.id)]
  const confusable = card !== undefined && card.stability >= CONFUSABLE_STABILITY
  // En escribir y dictado la respuesta se escribe; en tarjetas, uno mismo se califica: sin teclas.
  const options =
    isTypedMode(mode) || mode === 'flash'
      ? []
      : buildOptions(word, distractorPool(deck, word), undefined, undefined, { confusable })
  return { word, mode, reason, options, ...(trusted ? { trusted } : {}) }
}

/** Clave de la ronda en la sesión: en la inteligente, habilidad y palabra (puede salir en varias). */
const sessionKey = (deck: Deck, round: Round) =>
  deck.kind === 'coach' ? cardKey(trackOf(round.mode), round.word.id) : round.word.id

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
  s.next
    ? {
        ...s,
        round: s.next,
        next: null,
        wrong: [],
        typed: null,
        revealed: false,
        rating: null,
        solved: false,
        expanded: false,
      }
    : s

export interface QuizOptions {
  /** Modo concentración: al pasar este momento (ms), la siguiente ronda es el resumen. */
  endsAt?: number | null
}

export function useQuiz(deck: Deck, mode: Mode, { endsAt = null }: QuizOptions = {}) {
  // Objeto mutable de la sesión: no se pinta, solo alimenta al planificador.
  const [session] = useState(createSession)
  const [state, setState] = useState<State>(() => ({
    round: nextRound(deck, mode, session),
    next: null,
    wrong: [],
    typed: null,
    revealed: false,
    rating: null,
    solved: false,
    expanded: false,
    goalReached: false,
    levelDone: false,
    summary: null,
    stats: EMPTY_STATS,
  }))
  // Evita registrar dos veces un acierto si llegan dos toques antes de volver a pintar.
  const resolving = useRef(false)
  // El resumen de "tiempo cumplido" sale una vez: si se sigue practicando, ya no interrumpe.
  const timeShown = useRef(false)
  // Fijo durante la partida: una ref, para que avanzar no dependa de él.
  const deadline = useRef(endsAt)
  // Momento en que apareció la palabra: lo que se tarda en acertar afina el repaso espaciado.
  const shownAt = useRef(0)
  // Modo tarjetas: cuándo se mostró la traducción (lo que se tardó en decidirse a verla).
  const revealedAt = useRef(0)
  // El modo es de cada ronda: en la sesión inteligente cambia de una a otra.
  const roundMode = state.round.mode
  const onShow = soundsOnShow(roundMode)
  // Si la pregunta no es la palabra inglesa, sonar antes delataría la respuesta: suena al acertar.
  const canReplay = onShow || state.solved

  useEffect(() => {
    shownAt.current = performance.now()
  }, [state.round])

  useEffect(() => {
    if (audioIsPrompt(roundMode) || (onShow && getSettings().autoplay)) void playPronunciation(state.round.word.id)
    else preloadPronunciation(state.round.word.id)
  }, [state.round, roundMode, onShow])

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
      // Se acabó el tiempo del modo concentración: la ronda en curso termina y llega el resumen.
      if (deadline.current !== null && !timeShown.current && Date.now() >= deadline.current) {
        timeShown.current = true
        return { ...s, expanded: false, summary: 'time' }
      }
      // Completar un nivel es más raro (y más grande) que la meta del día: se celebra primero.
      if (s.levelDone) return { ...s, levelDone: false, goalReached: false, expanded: false, summary: 'level' }
      // En el modo concentración la meta no interrumpe: se celebra al terminar.
      if (s.goalReached && deadline.current === null)
        return { ...s, goalReached: false, expanded: false, summary: 'goal' }
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

  /** Milisegundos desde que apareció la palabra. */
  const elapsed = () => performance.now() - shownAt.current

  /**
   * Cierra la ronda: registra la respuesta, avanza la sesión, calcula la siguiente palabra y decide
   * si la partida se detiene para mostrar el detalle.
   */
  function solve(result: Answer, extra: Partial<State> = {}) {
    const { round, stats } = state
    const { clean } = result
    const track = trackOf(round.mode)
    resolving.current = true
    const isNew = !cardLookup(getProgress(), track)(round.word.id)
    const { dailyGoal, detailsPause } = getSettings()
    const answeredBefore = todayStats(getProgress()).answers
    const levelWasDone = deck.kind === 'level' && deckMastered(deck, track)
    recordAnswer(track, round.word.id, { ...result, trusted: round.trusted })
    feedback(clean ? 'correct' : 'wrong')
    advanceSession(session, sessionKey(deck, round), clean)
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
    solve({ clean: wrong.length === 0, ms: elapsed() })
  }

  /**
   * Modo escribir: exacta o "casi" (un error de tecleo) cuentan como acierto, "casi" con nota más
   * baja; incorrecta muestra la respuesta y cuenta como fallo. Con una pista, la nota es como mucho
   * la de "casi": se sabía, pero no del todo.
   */
  function submitTyped(text: string, { hinted = false } = {}) {
    if (resolving.current || state.solved || !text.trim()) return
    const verdict = judgeTyped(text, state.round.word.en)
    solve(
      { clean: verdict !== 'wrong', almost: verdict === 'almost' || (hinted && verdict === 'exact'), ms: elapsed() },
      { typed: { text, verdict, hinted } },
    )
  }

  /** Modo tarjetas: muestra la traducción para calificarse. El tiempo de respuesta se mide hasta aquí. */
  function reveal() {
    if (state.solved || state.revealed) return
    revealedAt.current = performance.now()
    setState((s) => ({ ...s, revealed: true }))
  }

  /** Modo tarjetas: la nota que uno se pone, tal cual, para el repaso espaciado. */
  function rate(rating: SelfRating) {
    if (resolving.current || state.solved || !state.revealed) return
    solve(answerFromRating(rating, revealedAt.current - shownAt.current), { rating })
  }

  function replay({ slow = false }: { slow?: boolean } = {}) {
    if (canReplay) void playPronunciation(state.round.word.id, { slow })
  }

  return { ...state, canReplay, answer, submitTyped, reveal, rate, replay, expand, advance, resume, requestExit }
}
