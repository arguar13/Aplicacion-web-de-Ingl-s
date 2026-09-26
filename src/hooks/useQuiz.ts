import { useEffect, useRef, useState } from 'react'
import { playPronunciation, preloadPronunciation } from '@/lib/audio'
import type { Deck } from '@/lib/decks'
import { cardLookup, type Direction, getProgress, recordAnswer, recordStreak } from '@/lib/progress'
import { buildOptions } from '@/lib/quiz'
import { advanceSession, createSession, pickNext, type Session } from '@/lib/scheduler'
import type { Round } from '@/lib/types'

/** Tiempo que se muestra el acierto antes de pasar a la siguiente palabra. */
const ADVANCE_DELAY_MS = 850

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
  stats: QuizStats
}

function nextRound(deck: Deck, direction: Direction, session: Session): Round {
  const lookup = cardLookup(getProgress(), direction)
  const pick = pickNext(deck.words, lookup, session, Date.now(), { newOrder: deck.newOrder })
  return { ...pick, options: buildOptions(pick.word, deck.words) }
}

export function useQuiz(deck: Deck, direction: Direction) {
  // Objeto mutable de la sesión: no se pinta, solo alimenta al planificador.
  const [session] = useState(createSession)
  const [state, setState] = useState<State>(() => ({
    round: nextRound(deck, direction, session),
    next: null,
    wrong: [],
    solved: false,
    stats: { solved: 0, firstTry: 0, streak: 0 },
  }))
  // Evita registrar dos veces un acierto si llegan dos toques antes de volver a pintar.
  const resolving = useRef(false)

  // La pronunciación suena en cuanto aparece la palabra.
  useEffect(() => {
    playPronunciation(state.round.word.id)
  }, [state.round])

  useEffect(() => {
    if (state.next) preloadPronunciation(state.next.word.id)
  }, [state.next])

  useEffect(() => {
    if (!state.solved) return
    const timer = setTimeout(() => {
      resolving.current = false
      setState((s) => (s.next ? { ...s, round: s.next, next: null, wrong: [], solved: false } : s))
    }, ADVANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state.solved])

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
    setState({
      ...state,
      solved: true,
      next: nextRound(deck, direction, session),
      stats: { solved: stats.solved + 1, firstTry: stats.firstTry + (clean ? 1 : 0), streak },
    })
  }

  const replay = () => playPronunciation(state.round.word.id)

  return { ...state, answer, replay }
}
