/**
 * Experiencia (XP) y rangos: una medida de todo lo practicado que solo sube. Se gana con cada
 * respuesta (más si es a la primera o una palabra nueva), en Relámpago y al cumplir misiones.
 */
import type { DayStats } from './progress'

export const XP_PER_ANSWER = 10
export const XP_CLEAN_BONUS = 5
export const XP_NEW_WORD = 15

/** Experiencia de una respuesta. */
export function xpForAnswer({ clean, fresh }: { clean: boolean; fresh: boolean }): number {
  return XP_PER_ANSWER + (clean ? XP_CLEAN_BONUS : 0) + (fresh ? XP_NEW_WORD : 0)
}

/** Experiencia de una tanda de práctica (Relámpago): respuestas y aciertos, sin palabras nuevas. */
export function xpForPractice({ answers, clean }: { answers: number; clean: number }): number {
  return answers * XP_PER_ANSWER + clean * XP_CLEAN_BONUS
}

/**
 * Experiencia que corresponde a un historial diario: con ella arranca quien ya practicaba antes de
 * que existiera la XP (y así no empieza de cero).
 */
export function xpFromHistory(history: Readonly<Record<string, DayStats>>): number {
  let xp = 0
  for (const day of Object.values(history)) {
    xp += day.answers * XP_PER_ANSWER + day.clean * XP_CLEAN_BONUS + day.fresh * XP_NEW_WORD
  }
  return xp
}

export interface Rank {
  name: string
  /** Experiencia necesaria para alcanzarlo. */
  xp: number
}

/** Rangos de aprendiz, de menor a mayor. Con la meta por defecto (20 al día) se sube uno cada pocas semanas. */
export const RANKS: readonly Rank[] = [
  { name: 'Novato', xp: 0 },
  { name: 'Aprendiz', xp: 300 },
  { name: 'Explorador', xp: 1000 },
  { name: 'Viajero', xp: 2500 },
  { name: 'Hablante', xp: 5000 },
  { name: 'Experto', xp: 10_000 },
  { name: 'Maestro', xp: 20_000 },
  { name: 'Leyenda', xp: 40_000 },
]

export interface RankStatus {
  rank: Rank
  /** Número del rango, desde 1. */
  level: number
  /** El siguiente rango, o null en el último. */
  next: Rank | null
  /** Avance hacia el siguiente (0–1); 1 en el último. */
  progress: number
}

export function rankOf(xp: number): RankStatus {
  let index = 0
  for (const [i, rank] of RANKS.entries()) if (xp >= rank.xp) index = i
  const rank = RANKS[index]
  const next = RANKS[index + 1] ?? null
  const progress = next ? Math.min(1, (xp - rank.xp) / (next.xp - rank.xp)) : 1
  return { rank, level: index + 1, next, progress }
}
