import { useCallback, useEffect, useReducer } from 'react'
import { playPronunciation, preloadPronunciation } from '@/lib/audio'
import { createRound } from '@/lib/quiz'
import type { Round, Word } from '@/lib/types'

/** Tiempo que se muestra el acierto antes de pasar a la siguiente palabra. */
const ADVANCE_DELAY_MS = 850

export interface QuizStats {
  /** Palabras resueltas. */
  solved: number
  /** Palabras resueltas sin fallar. */
  firstTry: number
  streak: number
  bestStreak: number
}

interface State {
  round: Round
  upcoming: Round
  /** Ids de las teclas que el usuario ya pulsó mal en esta ronda. */
  wrong: string[]
  solved: boolean
  stats: QuizStats
}

type Action =
  | { type: 'answer'; id: string }
  | { type: 'advance'; upcoming: Round }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'answer': {
      if (state.solved || state.wrong.includes(action.id)) return state
      if (action.id !== state.round.word.id) {
        return { ...state, wrong: [...state.wrong, action.id], stats: { ...state.stats, streak: 0 } }
      }
      const clean = state.wrong.length === 0
      const streak = clean ? state.stats.streak + 1 : 0
      return {
        ...state,
        solved: true,
        stats: {
          solved: state.stats.solved + 1,
          firstTry: state.stats.firstTry + (clean ? 1 : 0),
          streak,
          bestStreak: Math.max(state.stats.bestStreak, streak),
        },
      }
    }

    case 'advance':
      return { ...state, round: state.upcoming, upcoming: action.upcoming, wrong: [], solved: false }
  }
}

function init(words: readonly Word[]): State {
  const round = createRound(words)
  const upcoming = createRound(words, new Set([round.word.id]))
  return {
    round,
    upcoming,
    wrong: [],
    solved: false,
    stats: { solved: 0, firstTry: 0, streak: 0, bestStreak: 0 },
  }
}

export function useQuiz(words: readonly Word[]) {
  const [state, dispatch] = useReducer(reducer, words, init)
  const { round, upcoming, solved } = state

  // La pronunciación suena en cuanto aparece la palabra.
  useEffect(() => {
    playPronunciation(round.word.id)
  }, [round.word.id])

  useEffect(() => {
    preloadPronunciation(upcoming.word.id)
  }, [upcoming.word.id])

  useEffect(() => {
    if (!solved) return
    const timer = setTimeout(() => {
      const avoid = new Set([round.word.id, upcoming.word.id])
      dispatch({ type: 'advance', upcoming: createRound(words, avoid) })
    }, ADVANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [solved, words, round.word.id, upcoming.word.id])

  const answer = useCallback((id: string) => dispatch({ type: 'answer', id }), [])
  const replay = useCallback(() => playPronunciation(round.word.id), [round.word.id])

  return { ...state, answer, replay }
}
