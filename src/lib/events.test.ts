import { beforeEach, describe, expect, it } from 'vitest'
import { getEvents, MAX_EVENTS, mergeEvents, parseEvents, type StudyEvent } from './events'
import { getProgress, recordAnswer, resetProgress, todayStats } from './progress'

const NOW = new Date(2026, 8, 27, 10).getTime()
const event = (t: number, id = 'the'): StudyEvent => ({ t, id, track: 'en-es', r: 'clean', ms: 1000 })

beforeEach(() => resetProgress())

describe('historial de respuestas', () => {
  it('cada respuesta deja su evento: resultado y tiempo', () => {
    recordAnswer('en-es', 'the', { clean: true, ms: 1234.6 }, NOW)
    recordAnswer('type', 'water', { clean: true, almost: true, ms: 3000 }, NOW + 1)
    recordAnswer('listen', 'tree', { clean: false, ms: 5000 }, NOW + 2)
    recordAnswer('en-es', 'the', { clean: true, ms: 900 }, NOW + 3)
    // `f` marca el primer encuentro con la palabra en esa habilidad (lo usa el entrenador).
    expect(getEvents()).toEqual([
      { t: NOW, id: 'the', track: 'en-es', r: 'clean', ms: 1235, f: true },
      { t: NOW + 1, id: 'water', track: 'type', r: 'almost', ms: 3000, f: true },
      { t: NOW + 2, id: 'tree', track: 'listen', r: 'miss', ms: 5000, f: true },
      { t: NOW + 3, id: 'the', track: 'en-es', r: 'clean', ms: 900 },
    ])
  })

  it('el día guarda cuántas palabras hay dominadas', () => {
    recordAnswer('en-es', 'the', { clean: true, ms: 1000 }, NOW)
    expect(todayStats(getProgress(), NOW).mastered).toBe(0)
  })

  it('borrar el progreso borra también el historial', () => {
    recordAnswer('en-es', 'the', { clean: true, ms: 1000 }, NOW)
    resetProgress()
    expect(getEvents()).toEqual([])
  })

  it('valida, ordena y limita lo leído', () => {
    const many = Array.from({ length: MAX_EVENTS + 10 }, (_, i) => event(NOW + i))
    expect(parseEvents([...many, { t: 'x' }, null, { ...event(0), track: 'otro' }])).toHaveLength(MAX_EVENTS)
    expect(parseEvents([event(NOW + 5), event(NOW)]).map((e) => e.t)).toEqual([NOW, NOW + 5])
    expect(parseEvents('nada')).toEqual([])
  })

  it('combina dos historiales sin duplicar respuestas', () => {
    const merged = mergeEvents([event(NOW), event(NOW + 1)], [event(NOW + 1), event(NOW + 2)])
    expect(merged.map((e) => e.t)).toEqual([NOW, NOW + 1, NOW + 2])
  })
})
