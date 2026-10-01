import { describe, expect, it } from 'vitest'
import { ALL_WORDS, distractorPool } from './decks'
import { EMPTY_PROGRESS, type ProgressData } from './progress'
import { DAY, type CardState } from './scheduler'
import { buildSmartDeck, dueToday, favoriteWords, forecast, hardWords } from './smartDecks'

const NOW = new Date(2026, 8, 27, 10).getTime()
const card = (due: number, lapses = 0, difficulty = 5): CardState => ({
  due,
  stability: 3,
  difficulty,
  phase: 'review',
  step: 0,
  reps: 3,
  lapses,
  last: due - 3 * DAY,
})
const [a, b, c, d] = ALL_WORDS
const progress: ProgressData = {
  ...EMPTY_PROGRESS,
  cards: {
    [`en-es:${a.id}`]: card(NOW - 2 * DAY, 3),
    [`en-es:${b.id}`]: card(NOW + 3 * 3_600_000),
    [`en-es:${c.id}`]: card(NOW + 2 * DAY, 0, 9),
    [`en-es:${d.id}`]: card(NOW + 30 * DAY),
    [`es-en:${d.id}`]: card(NOW - DAY, 5),
  },
}

describe('mazos inteligentes', () => {
  it('las favoritas se practican en el orden en que se marcaron, ignorando ids desconocidos', () => {
    const withFavorites = { ...progress, favorites: [c.id, 'no-existe', a.id] }
    expect(favoriteWords(withFavorites)).toEqual([c, a])
    const deck = buildSmartDeck('favorites', withFavorites, 'en-es', NOW)
    expect(deck).toMatchObject({ id: 'favorites', kind: 'favorites', name: 'Favoritas', words: [c, a] })
    expect(buildSmartDeck('favorites', EMPTY_PROGRESS, 'en-es', NOW).words).toEqual([])
  })

  it('el repaso del día incluye lo atrasado y lo que vence hoy, lo más atrasado primero', () => {
    expect(dueToday(progress, 'en-es', NOW)).toEqual([a, b])
    expect(dueToday(progress, 'es-en', NOW)).toEqual([d])
  })

  it('las difíciles son las olvidadas varias veces o de dificultad alta, por sentido', () => {
    expect(hardWords(progress, 'en-es')).toEqual([a, c])
    expect(hardWords(EMPTY_PROGRESS, 'en-es')).toEqual([])
  })

  it('la previsión cuenta repasos por día del calendario, con lo atrasado en hoy', () => {
    expect(forecast(progress, 'en-es', NOW)).toEqual([2, 0, 1, 0, 0, 0, 0])
  })

  it('arma mazos con nombre y palabras fijas, sin afectar a los distractores', () => {
    const deck = buildSmartDeck('review', progress, 'en-es', NOW)
    expect(deck).toMatchObject({ id: 'review', kind: 'review', name: 'Repaso del día', words: [a, b] })
    // Los distractores salen del vocabulario, no de un mazo de dos palabras.
    expect(distractorPool(deck, a).length).toBeGreaterThan(100)
  })
})
