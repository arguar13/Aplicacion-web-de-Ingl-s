/**
 * Informe de la semana: qué se hizo en los últimos 7 días, lo que más costó y a qué hora del día
 * se rinde mejor. Sale del historial de respuestas y del progreso por día (nada nuevo que guardar).
 */
import type { StudyEvent } from './events'
import { dayKey, type ProgressData } from './progress'
import { DAY } from './scheduler'

/** Respuestas mínimas en una franja horaria para decir que es la mejor (con menos es azar). */
const MIN_HOUR_ANSWERS = 15
const TOUGHEST_SHOWN = 5

export interface WeeklyReport {
  answers: number
  /** Acertadas a la primera, 0–1; null sin respuestas. */
  accuracy: number | null
  /** Palabras vistas por primera vez (en cualquier habilidad). */
  newWords: number
  /** Dominadas ganadas en la semana. */
  masteredGain: number
  activeDays: number
  /** Tiempo de estudio de la semana (ms). */
  ms: number
  /** Franja de 3 horas con mejor acierto en el último mes (con suficientes respuestas). */
  bestHours: { from: number; to: number; accuracy: number } | null
  /** Las que más se fallaron en la semana, de más a menos. */
  toughest: Array<{ id: string; misses: number }>
}

export function weeklyReport(events: readonly StudyEvent[], progress: ProgressData, now: number): WeeklyReport {
  const weekStart = now - 7 * DAY
  const week = events.filter((event) => event.t > weekStart && event.t <= now)
  const clean = week.filter((event) => event.r === 'clean').length

  const days = Array.from({ length: 7 }, (_, i) => dayKey(now - i * DAY))
  const stats = days.map((day) => progress.history[day])
  const ms = stats.reduce((sum, day) => sum + (day?.ms ?? 0), 0)
  const activeDays = stats.filter((day) => (day?.answers ?? 0) > 0).length
  // Dominadas: la última cifra de la semana menos la última de antes de la semana.
  const masteredAt = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const value = progress.history[dayKey(now - i * DAY)]?.mastered
      if (value !== undefined) return value
    }
    return undefined
  }
  const latest = masteredAt(0, 7)
  const before = masteredAt(7, 60) ?? 0
  const masteredGain = latest === undefined ? 0 : Math.max(0, latest - before)

  const misses = new Map<string, number>()
  for (const event of week) if (event.r === 'miss') misses.set(event.id, (misses.get(event.id) ?? 0) + 1)
  const toughest = [...misses]
    .map(([id, count]) => ({ id, misses: count }))
    .toSorted((a, b) => b.misses - a.misses)
    .slice(0, TOUGHEST_SHOWN)

  return {
    answers: week.length,
    accuracy: week.length > 0 ? clean / week.length : null,
    newWords: new Set(week.filter((event) => event.f).map((event) => event.id)).size,
    masteredGain,
    activeDays,
    ms,
    bestHours: bestHours(events.filter((event) => event.t > now - 30 * DAY && event.t <= now)),
    toughest,
  }
}

/** Franja de 3 horas (0–3, 3–6…) con mejor acierto, entre las que tienen bastantes respuestas. */
function bestHours(events: readonly StudyEvent[]): WeeklyReport['bestHours'] {
  const slots = Array.from({ length: 8 }, () => ({ answers: 0, clean: 0 }))
  for (const event of events) {
    const slot = slots[Math.floor(new Date(event.t).getHours() / 3)]
    slot.answers++
    if (event.r === 'clean') slot.clean++
  }
  let best: WeeklyReport['bestHours'] = null
  for (const [index, slot] of slots.entries()) {
    if (slot.answers < MIN_HOUR_ANSWERS) continue
    const accuracy = slot.clean / slot.answers
    if (!best || accuracy > best.accuracy) best = { from: index * 3, to: index * 3 + 3, accuracy }
  }
  return best
}
