import { beforeEach, describe, expect, it } from 'vitest'
import {
  cardLookup,
  getProgress,
  KNOWN_STABILITY_DAYS,
  markKnown,
  parseProgress,
  recordAnswer,
  resetProgress,
  restoreCard,
  todayStats,
  toggleFavorite,
} from './progress'
import { isMastered } from './scheduler'

const NOW = new Date(2026, 8, 27, 10).getTime()

beforeEach(() => resetProgress())

describe('historial diario', () => {
  it('cuenta respuestas, aciertos a la primera, palabras nuevas y tiempo', () => {
    recordAnswer('en-es', 'the', { clean: true, ms: 2000 }, NOW)
    recordAnswer('en-es', 'water', { clean: false, ms: 5000 }, NOW + 60_000)
    recordAnswer('en-es', 'the', { clean: true, ms: 1000 }, NOW + 120_000)
    expect(todayStats(getProgress(), NOW)).toEqual({ answers: 3, clean: 2, fresh: 2, ms: 8000, mastered: 0 })
  })

  it('una respuesta tras una pausa larga no infla el tiempo de estudio', () => {
    recordAnswer('en-es', 'the', { clean: true, ms: 10 * 60_000 }, NOW)
    expect(todayStats(getProgress(), NOW).ms).toBe(30_000)
  })

  it('cada día por separado, y los sentidos cuentan juntos', () => {
    recordAnswer('en-es', 'the', { clean: true, ms: 1000 }, NOW)
    recordAnswer('es-en', 'the', { clean: true, ms: 1000 }, NOW + 24 * 3_600_000)
    expect(todayStats(getProgress(), NOW).answers).toBe(1)
    expect(todayStats(getProgress(), NOW + 24 * 3_600_000)).toMatchObject({ answers: 1, fresh: 1 })
  })

  it('valida el historial guardado: descarta días y datos dañados', () => {
    const parsed = parseProgress({
      cards: {},
      history: {
        '2026-09-26': { answers: 4, clean: 9, fresh: 1, ms: 1000 },
        ayer: { answers: 1, clean: 1, fresh: 1, ms: 1 },
        '2026-09-25': { answers: -1 },
      },
    })
    expect(parsed.history).toEqual({ '2026-09-26': { answers: 4, clean: 4, fresh: 1, ms: 1000 } })
  })
})

describe('favoritas y "ya la sé"', () => {
  it('marca y desmarca favoritas', () => {
    toggleFavorite('the')
    toggleFavorite('water')
    toggleFavorite('the')
    expect(getProgress().favorites).toEqual(['water'])
  })

  it('"ya la sé" la deja dominada con repaso en un mes, y se puede deshacer', () => {
    const previous = markKnown('en-es', 'the', NOW)
    expect(previous).toBeUndefined()
    const card = cardLookup(getProgress(), 'en-es')('the')
    expect(card && isMastered(card)).toBe(true)
    expect(card?.due).toBe(NOW + KNOWN_STABILITY_DAYS * 86_400_000)
    restoreCard('en-es', 'the', previous)
    expect(cardLookup(getProgress(), 'en-es')('the')).toBeUndefined()
  })
})
