/** Formatos de fecha y número en español. */

const DAY = 24 * 60 * 60 * 1000
const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const longDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })

const startOfDay = (time: number) => {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** "hoy", "ayer", "hace 3 días", "hace 2 meses"… según días de calendario. */
export function relativeDay(then: number, now = Date.now()): string {
  const days = Math.round((startOfDay(then) - startOfDay(now)) / DAY)
  if (days > -30) return relative.format(days, 'day')
  if (days > -365) return relative.format(Math.round(days / 30), 'month')
  return relative.format(Math.round(days / 365), 'year')
}

export const formatLongDate = (time: number) => longDate.format(time)

export const formatCount = (n: number) => n.toLocaleString('es')

/** "1 palabra", "3 palabras": número con el sustantivo en singular o plural. */
export const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${formatCount(n)} ${n === 1 ? singular : pluralForm}`
