import { useEffect, useRef, useState } from 'react'
import { playPronunciation, preloadPronunciation } from '@/lib/audio'
import { type Deck, distractorPool } from '@/lib/decks'
import { cardLookup, getProgress, recordAnswer, recordStreak } from '@/lib/progress'
import { buildOptions } from '@/lib/quiz'
import { advanceSession, createSession, pickNext, type Session } from '@/lib/scheduler'
import { getSettings } from '@/lib/settings'
import type { Direction, Round } from '@/lib/types'

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
}

interface State {
  round: Round
  /** Siguiente ronda, ya calculada mientras se muestra el acierto. */
  next: Round | null
  /** Ids de las teclas que el usuario ya pulsó mal en esta ronda. */
  wrong: string[]
  solved: boolean
  /** Tras responder, la partida se detiene con el detalle de la palabra a la vista. */
  expanded: boolean
  stats: QuizStats
}

function nextRound(deck: Deck, direction: Direction, session: Session): Round {
  const lookup = cardLookup(getProgress(), direction)
  const pick = pickNext(deck.words, lookup, session, Date.now(), { newOrder: deck.newOrder })
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
    stats: { solved: 0, firstTry: 0, streak: 0 },
  }))
  // Evita registrar dos veces un acierto si llegan dos toques antes de volver a pintar.
  const resolving = useRef(false)
  // Inglés → español: suena al aparecer. Español → inglés: sonar antes delataría la respuesta,
  // así que suena al acertar.
  const promptIsEnglish = direction === 'en-es'
  const canReplay = promptIsEnglish || state.solved

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
    if (!state.solved || state.expanded) return
    const timer = setTimeout(advance, promptIsEnglish ? ADVANCE_DELAY_MS : ADVANCE_DELAY_WITH_AUDIO_MS)
    return () => clearTimeout(timer)
  }, [state.solved, state.expanded, promptIsEnglish])

  /** Pasa a la siguiente palabra (ya calculada al acertar). */
  function advance() {
    resolving.current = false
    setState((s) =>
      s.solved && s.next ? { ...s, round: s.next, next: null, wrong: [], solved: false, expanded: false } : s,
    )
  }

  /** Detiene el avance automático para ver el detalle de la palabra recién resuelta. */
  function expand() {
    setState((s) => (s.solved ? { ...s, expanded: true } : s))
  }

  function answer(id: string) {
    const { round, wrong, solved, stats } = state
    if (resolving.current || solved || wrong.includes(id)) return

    if (id !== round.word.id) {
      setState({ ...state, wrong: [...wrong, id], stats: { ...stats, streak: 0 } })
      return
    }

    resolving.current = true
    const clean = wrong.length === 0
    recordAnswer(direction, round.word.id, clean)
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
      stats: { solved: stats.solved + 1, firstTry: stats.firstTry + (clean ? 1 : 0), streak },
    })
  }

  function replay({ slow = false }: { slow?: boolean } = {}) {
    if (canReplay) void playPronunciation(state.round.word.id, { slow })
  }

  return { ...state, canReplay, answer, replay, expand, advance }
}
