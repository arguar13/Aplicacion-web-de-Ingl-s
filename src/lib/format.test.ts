import { describe, expect, it } from 'vitest'
import { formatInterval, formatLongDate, plural, relativeDay } from './format'

const NOW = new Date(2026, 8, 27, 10).getTime()
const daysAgo = (n: number, hour = 12) => new Date(2026, 8, 27 - n, hour).getTime()

describe('formatos', () => {
  it('fechas relativas por días de calendario', () => {
    expect(relativeDay(daysAgo(0, 1), NOW)).toBe('hoy')
    expect(relativeDay(daysAgo(1, 23), NOW)).toBe('ayer')
    expect(relativeDay(daysAgo(3), NOW)).toBe('hace 3 días')
    expect(relativeDay(daysAgo(60), NOW)).toBe('hace 2 meses')
  })

  it('fecha larga', () => {
    expect(formatLongDate(NOW)).toBe('27 de septiembre de 2026')
  })
})

describe('plural', () => {
  it('concuerda el sustantivo con el número', () => {
    expect(plural(1, 'palabra')).toBe('1 palabra')
    expect(plural(0, 'palabra')).toBe('0 palabras')
    expect(plural(2, 'día')).toBe('2 días')
    expect(plural(1, 'dominada')).toBe('1 dominada')
    expect(plural(3978, 'palabra')).toBe('3978 palabras')
  })
})

describe('intervalos', () => {
  it('redondea a la unidad que se entiende de un vistazo', () => {
    const minute = 60_000
    const day = 24 * 60 * minute
    expect(formatInterval(20_000)).toBe('<1 min')
    expect(formatInterval(10 * minute)).toBe('10 min')
    expect(formatInterval(3 * 60 * minute)).toBe('3 h')
    expect(formatInterval(4 * day)).toBe('4 d')
    expect(formatInterval(21 * day)).toBe('3 sem')
    expect(formatInterval(95 * day)).toBe('3 meses')
    expect(formatInterval(365 * day)).toBe('1 año')
    expect(formatInterval(2.5 * 365 * day)).toBe('2,5 años')
  })
})
