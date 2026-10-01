/**
 * Tu camino: dónde está el estudiante en la escala del Marco Común Europeo (según las palabras
 * dominadas) y cuándo llegaría a cada nivel al ritmo de los últimos días. Sale del historial
 * diario de dominadas: nada nuevo que guardar.
 */
import { countMastered, dayKey, type ProgressData } from './progress'
import { DAY } from './scheduler'

export interface JourneyLevel {
  label: string
  /** Palabras dominadas con las que se suele estar en ese nivel. */
  words: number
  description: string
}

/** Niveles del Marco Común Europeo, con el vocabulario orientativo de cada uno. */
export const CEFR_LEVELS: readonly JourneyLevel[] = [
  { label: 'A1', words: 0, description: 'Lo básico para empezar' },
  { label: 'A2', words: 750, description: 'Situaciones cotidianas' },
  { label: 'B1', words: 1500, description: 'Conversar con soltura' },
  { label: 'B2', words: 3000, description: 'Series, noticias y trabajo' },
  { label: 'C1', words: 5000, description: 'Matices y precisión' },
  { label: 'C2', words: 8000, description: 'Dominio casi nativo' },
]

/** Días de historial que se miran para calcular el ritmo. */
export const PACE_WINDOW_DAYS = 30
/** Con menos días observados, el ritmo aún no dice nada. */
export const MIN_PACE_DAYS = 7

export interface Journey {
  mastered: number
  current: JourneyLevel
  next: JourneyLevel | null
  /** Avance dentro del nivel actual hacia el siguiente (0–1); 1 en el último. */
  progress: number
  /** Dominadas ganadas por día en la ventana; null sin días suficientes. */
  pace: number | null
  /** Días que abarca la medida del ritmo. */
  observedDays: number
  /** Para cada nivel por delante, en cuántos días se llegaría (null si no hay ritmo). */
  eta: Array<{ level: JourneyLevel; days: number | null }>
}

/** Dominadas al cierre del primer día con dato dentro de la ventana, y hace cuántos días fue. */
function earliestInWindow(progress: ProgressData, now: number): { mastered: number; daysAgo: number } | null {
  for (let daysAgo = PACE_WINDOW_DAYS; daysAgo > 0; daysAgo--) {
    const mastered = progress.history[dayKey(now - daysAgo * DAY)]?.mastered
    if (mastered !== undefined) return { mastered, daysAgo }
  }
  return null
}

export function journey(progress: ProgressData, now: number): Journey {
  const mastered = countMastered(progress.cards)
  let index = 0
  for (const [i, level] of CEFR_LEVELS.entries()) if (mastered >= level.words) index = i
  const current = CEFR_LEVELS[index]
  const next = CEFR_LEVELS[index + 1] ?? null
  const progressWithin = next ? Math.min(1, (mastered - current.words) / (next.words - current.words)) : 1

  const earliest = earliestInWindow(progress, now)
  const observedDays = earliest?.daysAgo ?? 0
  const pace =
    earliest && observedDays >= MIN_PACE_DAYS ? Math.max(0, mastered - earliest.mastered) / observedDays : null

  const eta = CEFR_LEVELS.slice(index + 1).map((level) => ({
    level,
    days: pace ? Math.ceil((level.words - mastered) / pace) : null,
  }))
  return { mastered, current, next, progress: progressWithin, pace, observedDays, eta }
}

/** "en 12 días", "en 3 semanas", "en 5 meses", "en 2 años". */
export function formatEta(days: number): string {
  if (days < 14) return `en ${days} ${days === 1 ? 'día' : 'días'}`
  if (days < 60) return `en ${Math.round(days / 7)} semanas`
  if (days < 365) return `en ${Math.round(days / 30)} meses`
  const years = Math.round(days / 365)
  return `en ${years} ${years === 1 ? 'año' : 'años'}`
}
