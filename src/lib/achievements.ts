/**
 * Logros. Su estado se calcula del progreso (no se guarda dos veces); solo se guarda cuándo se
 * desbloqueó cada uno, para anunciarlo una sola vez y mostrar la fecha en la vitrina.
 */
import { LEVELS } from './decks'
import { useSyncExternalStore } from 'react'
import { cardKey, countMastered, dailyStreak, getProgress, type ProgressData, subscribeProgress } from './progress'
import { isMastered } from './scheduler'
import { getSettings, subscribeSettings } from './settings'
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import { TRACKS } from './types'
import { isFiniteNumber, isRecord } from './validate'

export type AchievementIcon = 'spark' | 'target' | 'flame' | 'crown' | 'layers' | 'bolt' | 'compass' | 'check'

export interface AchievementInput {
  progress: ProgressData
  dailyGoal: number
  now: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: AchievementIcon
  /** Cuánto se lleva y cuánto hace falta. */
  measure: (input: AchievementInput) => { value: number; target: number }
}

const bestDay = (progress: ProgressData) => Math.max(0, ...Object.values(progress.history).map((d) => d.answers))

/** Días seguidos más largos que se han practicado (no solo la racha actual). */
function longestDailyStreak(days: readonly string[]): number {
  let best = 0
  let run = 0
  let previous: number | null = null
  for (const day of [...days].toSorted()) {
    const time = new Date(`${day}T12:00:00`).getTime()
    run = previous !== null && Math.round((time - previous) / 86_400_000) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = time
  }
  return best
}

/** Nivel más avanzado en palabras dominadas (en traducir), como fracción de sus palabras. */
function bestLevelShare(progress: ProgressData): { value: number; target: number } {
  let best = { value: 0, target: LEVELS[0].words.length }
  for (const deck of LEVELS) {
    const mastered = deck.words.filter((w) => {
      const card = progress.cards[cardKey('en-es', w.id)]
      return card !== undefined && isMastered(card)
    }).length
    if (mastered / deck.words.length > best.value / best.target) best = { value: mastered, target: deck.words.length }
  }
  return best
}

const tracksPracticed = (progress: ProgressData) =>
  TRACKS.filter((track) => Object.keys(progress.cards).some((key) => key.startsWith(`${track}:`))).length

const streakAchievement = (id: string, days: number, title: string, description: string): Achievement => ({
  id,
  title,
  description,
  icon: 'flame',
  measure: ({ progress, now }) => ({
    value: Math.max(longestDailyStreak(progress.days), dailyStreak(progress.days, now)),
    target: days,
  }),
})

const masteredAchievement = (id: string, count: number, title: string): Achievement => ({
  id,
  title,
  description: `Domina ${count.toLocaleString('es')} palabras.`,
  icon: count >= 500 ? 'crown' : 'check',
  measure: ({ progress }) => ({ value: countMastered(progress.cards), target: count }),
})

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-word',
    title: 'Primera tecla',
    description: 'Responde tu primera palabra.',
    icon: 'spark',
    measure: ({ progress }) => ({
      value: Object.values(progress.history).reduce((n, d) => n + d.answers, 0),
      target: 1,
    }),
  },
  {
    id: 'daily-goal',
    title: 'Meta cumplida',
    description: 'Cumple tu meta diaria por primera vez.',
    icon: 'target',
    measure: ({ progress, dailyGoal }) => ({ value: bestDay(progress), target: dailyGoal }),
  },
  streakAchievement('streak-3', 3, 'Buen ritmo', 'Practica 3 días seguidos.'),
  streakAchievement('streak-7', 7, 'Una semana', 'Practica 7 días seguidos.'),
  streakAchievement('streak-30', 30, 'Un mes entero', 'Practica 30 días seguidos.'),
  masteredAchievement('mastered-10', 10, 'Diez de diez'),
  masteredAchievement('mastered-100', 100, 'Centena'),
  masteredAchievement('mastered-500', 500, 'Medio millar'),
  masteredAchievement('mastered-1000', 1000, 'Mil palabras'),
  {
    id: 'level-complete',
    title: 'Nivel completo',
    description: 'Domina todas las palabras de un nivel en traducir.',
    icon: 'layers',
    measure: ({ progress }) => bestLevelShare(progress),
  },
  {
    id: 'perfect-streak',
    title: 'Sin fallar',
    description: 'Acierta 25 palabras seguidas a la primera.',
    icon: 'check',
    measure: ({ progress }) => ({ value: progress.bestStreak, target: 25 }),
  },
  {
    id: 'blitz-20',
    title: 'Rayo',
    description: 'Acierta 20 palabras en un Relámpago.',
    icon: 'bolt',
    measure: ({ progress }) => ({ value: progress.blitzBest, target: 20 }),
  },
  {
    id: 'all-skills',
    title: 'Todo terreno',
    description: 'Practica traducir, inverso, escuchar y escribir.',
    icon: 'compass',
    measure: ({ progress }) => ({ value: tracksPracticed(progress), target: TRACKS.length }),
  },
]

export interface AchievementStatus {
  achievement: Achievement
  value: number
  target: number
  unlocked: boolean
  /** Cuándo se desbloqueó (si se sabe). */
  at: number | null
}

export function evaluateAchievements(input: AchievementInput, unlockedAt: Record<string, number>): AchievementStatus[] {
  return ACHIEVEMENTS.map((achievement) => {
    const { value, target } = achievement.measure(input)
    const unlocked = value >= target || achievement.id in unlockedAt
    return { achievement, value: Math.min(value, target), target, unlocked, at: unlockedAt[achievement.id] ?? null }
  })
}

// --- Registro de desbloqueos -----------------------------------------------------------------------

interface UnlockLog {
  /** id → momento del desbloqueo. */
  unlocked: Record<string, number>
  /** Ya se hizo la primera evaluación (para no anunciar de golpe lo que se tenía de antes). */
  initialized: boolean
}

const SCHEMA: VersionedSchema<UnlockLog> = {
  version: 1,
  migrations: {},
  parse: (raw) => {
    const unlocked: Record<string, number> = {}
    if (isRecord(raw.unlocked)) {
      for (const [id, at] of Object.entries(raw.unlocked)) if (isFiniteNumber(at)) unlocked[id] = at
    }
    return { unlocked, initialized: raw.initialized === true }
  },
}

const store = createPersistedStore<UnlockLog>({
  ...SCHEMA,
  key: 'tecla:achievements',
  fallback: { unlocked: {}, initialized: false },
})

export const useUnlockLog = () => useStore(store)

/**
 * Anota los logros recién conseguidos y devuelve los que hay que anunciar. La primera vez anota en
 * silencio los que ya se tenían (quien actualiza la app no recibe una lluvia de avisos).
 */
export function recordUnlocks(input: AchievementInput): Achievement[] {
  const log = store.get()
  const fresh = evaluateAchievements(input, log.unlocked).filter((s) => s.unlocked && s.at === null)
  if (fresh.length === 0 && log.initialized) return []
  const unlocked = { ...log.unlocked }
  for (const status of fresh) unlocked[status.achievement.id] = input.now
  store.set({ unlocked, initialized: true })
  return log.initialized ? fresh.map((s) => s.achievement) : []
}

export function resetAchievements() {
  store.set({ unlocked: {}, initialized: true })
}

// --- Anuncios -------------------------------------------------------------------------------------

/** Logros que se anuncian juntos (los desbloqueados en un mismo cambio, p. ej. al restaurar una copia). */
export type Announcement = readonly Achievement[]

let announcements: Announcement[] = []
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}

/**
 * Vigila el progreso (y la meta diaria) y encola cada logro nuevo para anunciarlo. Devuelve la
 * función para dejar de vigilar.
 */
function checkAchievements() {
  const fresh = recordUnlocks({ progress: getProgress(), dailyGoal: getSettings().dailyGoal, now: Date.now() })
  if (fresh.length) {
    // Juntos en un solo aviso: restaurar una copia puede desbloquear muchos de golpe.
    announcements = [...announcements, fresh]
    emit()
  }
}

export function watchAchievements(): () => void {
  checkAchievements()
  const stopProgress = subscribeProgress(checkAchievements)
  const stopSettings = subscribeSettings(checkAchievements)
  return () => {
    stopProgress()
    stopSettings()
  }
}

/** El aviso que toca mostrar (el primero de la cola). */
export function useAnnouncement(): Announcement | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => announcements[0],
    () => undefined,
  )
}

export function dismissAnnouncement() {
  announcements = announcements.slice(1)
  emit()
}
