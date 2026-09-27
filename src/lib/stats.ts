/** Cálculos de la pantalla de estadísticas, a partir del historial diario del progreso. */
import { dailyStreak, dayKey, type DayStats, type ProgressData } from './progress'

const DAY = 24 * 60 * 60 * 1000

/** Fecha local a mediodía (así sumar días no tropieza con los cambios de hora). */
function noon(time: number): number {
  const d = new Date(time)
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

export interface ActivityDay {
  key: string
  time: number
  answers: number
  /** Nivel de intensidad 0–4 para el mapa de calor. */
  level: 0 | 1 | 2 | 3 | 4
  /** Día posterior a hoy (la última semana se completa hasta el domingo). */
  future: boolean
}

/** Intensidad según las palabras respondidas ese día, relativa a la meta diaria. */
export function activityLevel(answers: number, goal: number): ActivityDay['level'] {
  if (answers <= 0) return 0
  if (answers < goal / 2) return 1
  if (answers < goal) return 2
  if (answers < goal * 2) return 3
  return 4
}

/**
 * Semanas de actividad para el mapa de calor, de lunes a domingo, terminando en la semana actual.
 * Devuelve columnas (semanas) de 7 días.
 */
export function activityWeeks(
  history: ProgressData['history'],
  now: number,
  weeks: number,
  goal: number,
): ActivityDay[][] {
  const today = noon(now)
  const weekday = (new Date(today).getDay() + 6) % 7 // lunes = 0
  const lastSunday = today + (6 - weekday) * DAY
  const start = lastSunday - (weeks * 7 - 1) * DAY
  return Array.from({ length: weeks }, (_week, week) =>
    Array.from({ length: 7 }, (_day, day) => {
      const time = start + (week * 7 + day) * DAY
      const key = dayKey(time)
      const answers = history[key]?.answers ?? 0
      return { key, time, answers, level: activityLevel(answers, goal), future: time > today }
    }),
  )
}

export interface SeriesPoint {
  time: number
  value: number
}

/**
 * Palabras dominadas al final de cada uno de los últimos `days` días. Los días sin práctica
 * mantienen el valor anterior; antes del primer dato no hay punto.
 */
export function masteredSeries(history: ProgressData['history'], now: number, days: number): SeriesPoint[] {
  const today = noon(now)
  const keys = Object.keys(history).toSorted()
  let last: number | undefined
  for (const key of keys) {
    if (key >= dayKey(today - (days - 1) * DAY)) break
    last = history[key].mastered ?? last
  }
  const points: SeriesPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const time = today - i * DAY
    last = history[dayKey(time)]?.mastered ?? last
    if (last !== undefined) points.push({ time, value: last })
  }
  return points
}

export interface WeekAccuracy {
  /** Lunes de la semana. */
  start: number
  answers: number
  /** Acertadas a la primera sobre respondidas (0–1); null si no hubo práctica. */
  accuracy: number | null
}

/** Precisión de cada una de las últimas `weeks` semanas (de lunes a domingo). */
export function weeklyAccuracy(history: ProgressData['history'], now: number, weeks: number): WeekAccuracy[] {
  const today = noon(now)
  const monday = today - ((new Date(today).getDay() + 6) % 7) * DAY
  return Array.from({ length: weeks }, (_, i) => {
    const start = monday - (weeks - 1 - i) * 7 * DAY
    let answers = 0
    let clean = 0
    for (let d = 0; d < 7; d++) {
      const stats: DayStats | undefined = history[dayKey(start + d * DAY)]
      answers += stats?.answers ?? 0
      clean += stats?.clean ?? 0
    }
    return { start, answers, accuracy: answers ? clean / answers : null }
  })
}

export interface Totals {
  streak: number
  daysPracticed: number
  answers: number
  ms: number
  /** Precisión de los últimos 30 días (0–1); null si no hubo práctica. */
  accuracy30: number | null
}

export function totals(progress: ProgressData, now: number): Totals {
  const since = dayKey(noon(now) - 29 * DAY)
  let answers = 0
  let ms = 0
  let recentAnswers = 0
  let recentClean = 0
  for (const [key, stats] of Object.entries(progress.history)) {
    answers += stats.answers
    ms += stats.ms
    if (key >= since) {
      recentAnswers += stats.answers
      recentClean += stats.clean
    }
  }
  return {
    streak: dailyStreak(progress.days, now),
    daysPracticed: progress.days.length,
    answers,
    ms,
    accuracy30: recentAnswers ? recentClean / recentAnswers : null,
  }
}

/** "3 h 20 min", "45 min", "menos de 1 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'menos de 1 min'
  const hours = Math.floor(minutes / 60)
  if (hours === 0) return `${minutes} min`
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
