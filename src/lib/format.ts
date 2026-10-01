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

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Intervalo aproximado: "<1 min", "10 min", "3 h", "4 d", "3 sem", "2 meses", "1 año". */
export function formatInterval(ms: number): string {
  if (ms < MINUTE) return '<1 min'
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} min`
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`
  const days = Math.round(ms / DAY)
  if (days < 14) return `${days} d`
  if (days < 60) return `${Math.round(days / 7)} sem`
  if (days < 365) return `${Math.round(days / 30)} meses`
  const years = Math.round((days / 365) * 10) / 10
  return years === 1 ? '1 año' : `${years.toLocaleString('es')} años`
}
