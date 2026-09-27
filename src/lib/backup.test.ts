import { describe, expect, it } from 'vitest'
import { backupFileName, describeProgress, parseBackup, serializeBackup } from './backup'
import { EMPTY_PROGRESS, mergeProgress, type ProgressData } from './progress'
import { fromLeitner } from './scheduler'
import { parseSettings } from './settings'

const NOW = new Date(2026, 8, 27, 10).getTime()
/** Tarjeta equivalente a una caja Leitner (misma semántica que en la versión 1). */
const card = (box: number, seen: number, due = NOW) => fromLeitner(box, due, seen, 0)

const PROGRESS: ProgressData = {
  cards: { 'en-es:the': card(4, 5), 'es-en:the': card(2, 2), 'en-es:water': card(1, 1) },
  days: ['2026-09-25', '2026-09-26'],
  history: { '2026-09-26': { answers: 12, clean: 9, fresh: 3, ms: 60_000 } },
  bestStreak: 9,
  blitzBest: 7,
  lastDeckId: 'level-1',
}
const SETTINGS = { ...parseSettings({}), theme: 'dark' as const }

describe('copias de seguridad', () => {
  it('exportar e importar devuelve exactamente el mismo progreso y ajustes', () => {
    const parsed = parseBackup(serializeBackup(PROGRESS, SETTINGS, NOW))
    expect(parsed).toEqual({ ok: true, backup: { exportedAt: NOW, progress: PROGRESS, settings: SETTINGS } })
  })

  it('nombra el archivo con la fecha local', () => {
    expect(backupFileName(NOW)).toBe('tecla-copia-2026-09-27.json')
  })

  it('rechaza con un mensaje claro lo que no es una copia válida', () => {
    const cases: Array<[string, RegExp]> = [
      ['no es json', /dañado/],
      ['[]', /no es una copia/],
      [JSON.stringify({ format: 'otra-app', version: 1 }), /no es una copia/],
      [JSON.stringify({ format: 'tecla-copia', version: 99 }), /más nueva/],
      [JSON.stringify({ format: 'tecla-copia', version: 1, progress: 'x' }), /progreso válido/],
      [JSON.stringify({ format: 'tecla-copia', version: 1, progress: { version: 99, cards: {} } }), /más nueva/],
    ]
    for (const [text, error] of cases) {
      expect(parseBackup(text)).toEqual({ ok: false, error: expect.stringMatching(error) })
    }
  })

  it('valida el contenido: descarta tarjetas dañadas dentro de una copia', () => {
    const text = JSON.stringify({
      format: 'tecla-copia',
      version: 1,
      progress: { version: 2, cards: { 'en-es:the': card(4, 5), 'en-es:mal': { box: 'x' } }, days: [], bestStreak: 0 },
    })
    const parsed = parseBackup(text)
    expect(parsed.ok && Object.keys(parsed.backup.progress.cards)).toEqual(['en-es:the'])
  })

  it('resume cuántas palabras distintas hay practicadas y dominadas', () => {
    expect(describeProgress(PROGRESS)).toEqual({ words: 2, mastered: 1, days: 2, bestStreak: 9 })
    expect(describeProgress(EMPTY_PROGRESS)).toEqual({ words: 0, mastered: 0, days: 0, bestStreak: 0 })
  })
})

describe('combinar progresos', () => {
  it('se queda con la versión más practicada de cada palabra y une el resto', () => {
    const incoming: ProgressData = {
      cards: { 'en-es:the': card(2, 3), 'en-es:water': card(3, 4), 'en-es:tree': card(2, 1) },
      days: ['2026-09-20', '2026-09-26'],
      history: {
        '2026-09-20': { answers: 5, clean: 5, fresh: 5, ms: 20_000 },
        '2026-09-26': { answers: 8, clean: 8, fresh: 1, ms: 90_000 },
      },
      bestStreak: 15,
      blitzBest: 11,
      lastDeckId: 'level-3',
    }
    expect(mergeProgress(PROGRESS, incoming)).toEqual({
      cards: {
        'en-es:the': card(4, 5),
        'es-en:the': card(2, 2),
        'en-es:water': card(3, 4),
        'en-es:tree': card(2, 1),
      },
      days: ['2026-09-20', '2026-09-25', '2026-09-26'],
      history: {
        '2026-09-20': { answers: 5, clean: 5, fresh: 5, ms: 20_000 },
        '2026-09-26': { answers: 12, clean: 9, fresh: 3, ms: 90_000 },
      },
      bestStreak: 15,
      blitzBest: 11,
      lastDeckId: 'level-1',
    })
  })

  it('combinar con un progreso vacío no cambia nada', () => {
    expect(mergeProgress(PROGRESS, EMPTY_PROGRESS)).toEqual(PROGRESS)
    expect(mergeProgress(EMPTY_PROGRESS, PROGRESS)).toEqual(PROGRESS)
  })
})

describe('copias de versiones anteriores', () => {
  it('una copia con progreso Leitner (v1) se migra al importarla', () => {
    const text = JSON.stringify({
      format: 'tecla-copia',
      version: 1,
      progress: {
        version: 1,
        cards: { 'en-es:the': { box: 4, due: NOW, seen: 5, lapses: 0 } },
        days: [],
        bestStreak: 3,
      },
    })
    const parsed = parseBackup(text)
    expect(parsed.ok && parsed.backup.progress.cards['en-es:the']).toEqual(fromLeitner(4, NOW, 5, 0))
  })
})
