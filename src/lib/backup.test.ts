import { beforeEach, describe, expect, it } from 'vitest'
import { evaluateAchievements, getUnlocks, mergeUnlocks, recordUnlocks, resetAchievements } from './achievements'
import { type Backup, backupFileName, describeProgress, parseBackup, restoreBackup, serializeBackup } from './backup'
import { type CourseProgress, getCourseProgress, resetCourseProgress } from './courseProgress'
import { getEvents, replaceEvents, type StudyEvent } from './events'
import { EMPTY_PROGRESS, getProgress, mergeProgress, type ProgressData, replaceProgress } from './progress'
import { fromLeitner } from './scheduler'
import { getSettings, parseSettings, replaceSettings } from './settings'

const NOW = new Date(2026, 8, 27, 10).getTime()
/** Tarjeta equivalente a una caja Leitner (misma semántica que en la versión 1). */
const card = (box: number, seen: number, due = NOW) => fromLeitner(box, due, seen, 0)

// Los tests parten del progreso vacío: un campo nuevo con valor por defecto no los rompe.
const PROGRESS: ProgressData = {
  ...EMPTY_PROGRESS,
  cards: { 'en-es:the': card(4, 5), 'es-en:the': card(2, 2), 'en-es:water': card(1, 1) },
  days: ['2026-09-25', '2026-09-26'],
  history: { '2026-09-26': { answers: 12, clean: 9, fresh: 3, ms: 60_000 } },
  bestStreak: 9,
  blitzBest: 7,
  favorites: ['the'],
  lastDeckId: 'level-1',
}
const SETTINGS = { ...parseSettings({}), theme: 'dark' as const }
const EVENTS: StudyEvent[] = [{ t: NOW - 1000, id: 'the', track: 'en-es', r: 'clean', ms: 1200 }]
/** Los logros que da PROGRESS, conseguidos hace un día. */
const UNLOCKS = Object.fromEntries(
  evaluateAchievements({ progress: PROGRESS, dailyGoal: SETTINGS.dailyGoal, now: NOW }, {})
    .filter((status) => status.unlocked)
    .map((status) => [status.achievement.id, NOW - 86_400_000]),
)
/** Progreso del curso: una lección y el examen de A1 aprobado. */
const COURSE: CourseProgress = {
  lessons: { 'a1/verbo-to-be': { best: 1, at: NOW - 3_600_000 } },
  exams: { a1: { best: 0.9, at: NOW - 1_800_000 } },
}
const BACKUP: Backup = {
  exportedAt: NOW,
  progress: PROGRESS,
  settings: SETTINGS,
  events: EVENTS,
  achievements: UNLOCKS,
  course: COURSE,
}

describe('copias de seguridad', () => {
  it('el progreso del curso viaja en la copia; las copias anteriores lo traen vacío', () => {
    resetCourseProgress()
    const old = serializeBackup({ ...BACKUP, course: null }, NOW)
    expect(old).not.toContain('"course"')
    const parsed = parseBackup(old)
    expect(parsed.ok && parsed.backup.course).toBeNull()
    restoreBackup(BACKUP, 'replace')
    expect(getCourseProgress()).toEqual(COURSE)
    // Combinar se queda con la mejor nota de cada lección y examen.
    restoreBackup(
      {
        ...BACKUP,
        course: { lessons: { 'a1/verbo-to-be': { best: 0.5, at: NOW } }, exams: { a1: { best: 1, at: NOW } } },
      },
      'merge',
    )
    expect(getCourseProgress()).toEqual({
      lessons: { 'a1/verbo-to-be': { best: 1, at: NOW - 3_600_000 } },
      exams: { a1: { best: 1, at: NOW } },
    })
  })

  it('exportar e importar devuelve exactamente el mismo progreso, ajustes, historial y logros', () => {
    expect(Object.keys(UNLOCKS).length).toBeGreaterThan(0)
    expect(parseBackup(serializeBackup(BACKUP, NOW))).toEqual({ ok: true, backup: BACKUP })
  })

  it('una copia anterior a los logros se lee sin ellos, y los logros dañados se descartan', () => {
    const old = serializeBackup({ ...BACKUP, achievements: null }, NOW)
    expect(old).not.toContain('"achievements"')
    const parsed = parseBackup(old)
    expect(parsed.ok && parsed.backup.achievements).toBeNull()

    const damaged = parseBackup(old.replace(/\}\s*$/, ',"achievements":{"bueno":5,"malo":"x"}}'))
    expect(damaged.ok && damaged.backup.achievements).toEqual({ bueno: 5 })
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
      ...EMPTY_PROGRESS,
      cards: { 'en-es:the': card(2, 3), 'en-es:water': card(3, 4), 'en-es:tree': card(2, 1) },
      days: ['2026-09-20', '2026-09-26'],
      history: {
        '2026-09-20': { answers: 5, clean: 5, fresh: 5, ms: 20_000 },
        '2026-09-26': { answers: 8, clean: 8, fresh: 1, ms: 90_000 },
      },
      bestStreak: 15,
      blitzBest: 11,
      favorites: ['the', 'tree'],
      lastDeckId: 'level-3',
    }
    expect(mergeProgress(PROGRESS, incoming)).toEqual({
      ...EMPTY_PROGRESS,
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
      favorites: ['the', 'tree'],
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

/** Los logros que el vigilante anunciaría ahora mismo. */
const pendingAnnouncements = () =>
  recordUnlocks({ progress: getProgress(), dailyGoal: getSettings().dailyGoal, now: NOW })

describe('restaurar una copia', () => {
  beforeEach(() => {
    replaceProgress(EMPTY_PROGRESS)
    replaceEvents([])
    replaceSettings(parseSettings({}))
    resetAchievements()
  })

  it('reemplazar deja el dispositivo idéntico a la copia, con los logros en su fecha y sin anunciarlos', () => {
    restoreBackup(BACKUP, 'replace')
    expect(getProgress()).toEqual(PROGRESS)
    expect(getEvents()).toEqual(EVENTS)
    expect(getSettings()).toEqual(SETTINGS)
    expect(pendingAnnouncements()).toEqual([])
    expect(getUnlocks()).toEqual(UNLOCKS)
  })

  it('una copia sin logros los anota en silencio en vez de celebrarlos otra vez', () => {
    restoreBackup({ ...BACKUP, achievements: null }, 'replace')
    expect(pendingAnnouncements()).toEqual([])
    expect(Object.keys(getUnlocks()).toSorted()).toEqual(Object.keys(UNLOCKS).toSorted())
  })

  it('combinar conserva la fecha más antigua de cada logro', () => {
    expect(mergeUnlocks({ a: 5, b: 1 }, { a: 2, c: 9 })).toEqual({ a: 2, b: 1, c: 9 })
    restoreBackup(BACKUP, 'merge')
    expect(getUnlocks()).toEqual(UNLOCKS)
    expect(pendingAnnouncements()).toEqual([])
  })
})
