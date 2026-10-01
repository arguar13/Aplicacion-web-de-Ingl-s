import { describe, expect, it, vi } from 'vitest'
import { MemoryStorage } from '@/test/memoryStorage'
import { EMPTY_PROGRESS, parseProgress, PROGRESS_KEY, PROGRESS_SCHEMA, PROGRESS_VERSION } from './progress'
import { parseSettings, SETTINGS_KEY, SETTINGS_SCHEMA, SETTINGS_VERSION } from './settings'
import { fromLeitner } from './scheduler'
import { backupKey, createPersistedStore } from './store'
import { isRecord } from './validate'

// Mismo esquema que usa la app (versión, migraciones y validación), no una copia a mano.
const progressStore = (storage: Storage) =>
  createPersistedStore({ ...PROGRESS_SCHEMA, key: PROGRESS_KEY, fallback: EMPTY_PROGRESS, storage })
const settingsStore = (storage: Storage) =>
  createPersistedStore({ ...SETTINGS_SCHEMA, key: SETTINGS_KEY, fallback: parseSettings({}), storage })

/** Progreso tal como lo guardaba la Fase 5: sin campo `version`. */
const PHASE_5_PROGRESS = {
  cards: {
    'en-es:the': { box: 4, due: 1790000000000, seen: 5, lapses: 1 },
    'es-en:water': { box: 1, due: 1790000600000, seen: 2, lapses: 2 },
  },
  days: ['2026-09-24', '2026-09-25', '2026-09-26'],
  bestStreak: 12,
  lastDeckId: 'level-2',
}

/** El mismo progreso tras la migración v1 → v2 (Fase 8): cada caja Leitner pasa a FSRS. */
const PHASE_5_MIGRATED = {
  ...EMPTY_PROGRESS,
  ...PHASE_5_PROGRESS,
  cards: {
    'en-es:the': fromLeitner(4, 1790000000000, 5, 1),
    'es-en:water': fromLeitner(1, 1790000600000, 2, 2),
  },
}

describe('almacén persistido', () => {
  it('lee sin pérdidas el progreso guardado por la Fase 5 (migrado a FSRS)', () => {
    const storage = new MemoryStorage()
    storage.setItem(PROGRESS_KEY, JSON.stringify(PHASE_5_PROGRESS))
    expect(progressStore(storage).get()).toEqual(PHASE_5_MIGRATED)
    // Queda guardado en la versión nueva, con el original respaldado.
    expect(JSON.parse(storage.getItem(PROGRESS_KEY) ?? '')).toMatchObject({ version: PROGRESS_VERSION })
    expect(storage.getItem(backupKey(PROGRESS_KEY))).toBe(JSON.stringify(PHASE_5_PROGRESS))
  })

  it('lee sin pérdidas los ajustes guardados por la Fase 5', () => {
    const storage = new MemoryStorage()
    const phase5 = { direction: 'es-en', autoplay: false, theme: 'dark' }
    storage.setItem(SETTINGS_KEY, JSON.stringify(phase5))
    const store = settingsStore(storage)
    // `direction` (Fase 5) pasa a ser `mode` (Fase 9); los campos añadidos después (Fases 7, 8, 11 y
    // 16) toman su valor por defecto.
    expect(store.get()).toEqual({
      mode: 'es-en',
      autoplay: false,
      theme: 'dark',
      detailsPause: 'mistakes',
      dailyGoal: 20,
      newPerDay: 20,
      sounds: true,
      haptics: true,
      intensity: 'normal',
      startLevel: 1,
    })
  })

  it('el tema por defecto es el claro, y el automático de la versión 1 (su valor por defecto) pasa a claro', () => {
    expect(parseSettings({}).theme).toBe('light')
    const storage = new MemoryStorage()
    storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, theme: 'system' }))
    expect(settingsStore(storage).get().theme).toBe('light')
    // Elegido de nuevo tras la versión 2, el automático se respeta.
    const chosen = new MemoryStorage()
    chosen.setItem(SETTINGS_KEY, JSON.stringify({ version: 2, theme: 'system' }))
    expect(settingsStore(chosen).get().theme).toBe('system')
  })

  it('guarda con número de versión y conserva el tema en la raíz (index.html lo lee antes de pintar)', () => {
    const storage = new MemoryStorage()
    const store = settingsStore(storage)
    store.set({ ...store.get(), theme: 'dark' })
    expect(JSON.parse(storage.getItem(SETTINGS_KEY) ?? '')).toMatchObject({ version: SETTINGS_VERSION, theme: 'dark' })
  })

  it('un JSON ilegible no rompe la app y queda respaldado antes de sobrescribirse', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const storage = new MemoryStorage()
    storage.setItem(PROGRESS_KEY, '{"cards": {"en-es:the": ')
    const store = progressStore(storage)
    expect(store.get()).toEqual(EMPTY_PROGRESS)
    expect(storage.getItem(backupKey(PROGRESS_KEY))).toBe('{"cards": {"en-es:the": ')
    store.set({ ...EMPTY_PROGRESS, bestStreak: 1 })
    expect(storage.getItem(backupKey(PROGRESS_KEY))).toBe('{"cards": {"en-es:the": ')
  })

  it('descarta solo las entradas dañadas', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        cards: {
          ...PHASE_5_PROGRESS.cards,
          'en-es:bad-box': { box: 99, due: 1, seen: 1, lapses: 0 },
          'en-es:no-due': { box: 2, seen: 1, lapses: 0 },
          'xx-yy:wrong-direction': { box: 2, due: 1, seen: 1, lapses: 0 },
          'en-es:not-an-object': 'hola',
        },
        days: ['2026-09-26', 'ayer', '2026-09-24', '2026-09-26', 7, '2026-13-01'],
        bestStreak: -3,
        lastDeckId: 42,
      }),
    )
    expect(progressStore(storage).get()).toEqual({
      ...EMPTY_PROGRESS,
      cards: PHASE_5_MIGRATED.cards,
      days: ['2026-09-24', '2026-09-26'],
      history: {},
      bestStreak: 0,
      blitzBest: 0,
      favorites: [],
      lastDeckId: null,
    })
  })

  it('aplica las migraciones en cadena y guarda el resultado con la versión nueva', () => {
    const storage = new MemoryStorage()
    storage.setItem('k', JSON.stringify({ n: 1 }))
    const store = createPersistedStore({
      key: 'k',
      version: 3,
      fallback: { total: 0 },
      migrations: {
        1: (raw) => ({ count: raw.n }),
        2: (raw) => ({ total: Number(raw.count) * 10 }),
      },
      parse: (raw) => ({ total: typeof raw.total === 'number' ? raw.total : 0 }),
      storage,
    })
    expect(store.get()).toEqual({ total: 10 })
    expect(JSON.parse(storage.getItem('k') ?? '')).toEqual({ version: 3, total: 10 })
    expect(storage.getItem(backupKey('k'))).toBe(JSON.stringify({ n: 1 }))
  })

  it('si falta una migración, no inventa datos: usa el valor por defecto y respalda el original', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const storage = new MemoryStorage()
    storage.setItem('k', JSON.stringify({ version: 1, n: 1 }))
    const store = createPersistedStore({ key: 'k', version: 2, fallback: { n: 0 }, parse: () => ({ n: 5 }), storage })
    expect(store.get()).toEqual({ n: 0 })
    expect(storage.getItem(backupKey('k'))).toBe(JSON.stringify({ version: 1, n: 1 }))
  })

  it('no sobrescribe datos guardados por una versión más nueva de la app', () => {
    const storage = new MemoryStorage()
    const newer = JSON.stringify({ version: 9, total: 3, futureField: true })
    storage.setItem('k', newer)
    const store = createPersistedStore({
      key: 'k',
      version: 1,
      fallback: { total: 0 },
      parse: (raw) => ({ total: typeof raw.total === 'number' ? raw.total : 0 }),
      storage,
    })
    expect(store.get()).toEqual({ total: 3 })
    store.set({ total: 4 })
    expect(store.get()).toEqual({ total: 4 })
    expect(storage.getItem('k')).toBe(newer)
  })

  it('con la cuota llena sigue funcionando en memoria', () => {
    const storage = new MemoryStorage()
    storage.full = true
    const store = progressStore(storage)
    const listener = vi.fn<() => void>()
    store.subscribe(listener)
    store.set({ ...EMPTY_PROGRESS, bestStreak: 7 })
    expect(store.get().bestStreak).toBe(7)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('valida cualquier forma de dato sin lanzar', () => {
    for (const raw of [{}, { cards: [] }, { cards: null, days: 'x' }, { cards: { 'en-es:a': null } }]) {
      expect(() => parseProgress(raw)).not.toThrow()
      expect(isRecord(parseProgress(raw).cards)).toBe(true)
    }
  })
})
