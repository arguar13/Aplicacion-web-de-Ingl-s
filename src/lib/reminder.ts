/**
 * Recordatorio diario como evento de calendario (.ics, RFC 5545).
 *
 * Una web sin servidor no puede avisar a una hora de forma fiable: Notification Triggers se
 * abandonó, Periodic Background Sync solo existe en Chromium con la app instalada y sin hora
 * garantizada, y iOS no tiene nada equivalente. El calendario del dispositivo sí: un evento diario
 * recurrente, con aviso, que abre OpenSpeak. Funciona igual en iPhone, Android y escritorio.
 */

/** "HH:MM" válida. */
export const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

const pad = (n: number) => String(n).padStart(2, '0')

/** Texto para un campo iCalendar: se escapan \, ; , y saltos de línea. */
const escapeText = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

/** Las líneas de más de 75 octetos se parten (continuación con un espacio). */
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--
    out.push(rest.slice(0, cut))
    rest = ` ${rest.slice(cut)}`
  }
  out.push(rest)
  return out.join('\r\n')
}

export interface ReminderOptions {
  /** Hora local "HH:MM". */
  time: string
  /** Dirección de la app, para abrirla desde el evento. */
  url: string
  now?: number
}

/**
 * Evento diario a la hora indicada, empezando el próximo día en que esa hora aún no pasó. La hora es
 * "flotante" (sin zona): sigue siendo las 20:00 aunque se viaje o cambie el horario de verano.
 */
export function buildReminderIcs({ time, url, now = Date.now() }: ReminderOptions): string {
  if (!isTime(time)) throw new Error(`Hora no válida: ${time}`)
  const [hours, minutes] = time.split(':').map(Number)
  const start = new Date(now)
  start.setHours(hours, minutes, 0, 0)
  if (start.getTime() <= now) start.setDate(start.getDate() + 1)

  const local = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(hours)}${pad(minutes)}00`
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenSpeak//Recordatorio diario//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:tecla-recordatorio-${stamp}@tecla`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${local}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText('Practicar inglés con OpenSpeak')}`,
    `DESCRIPTION:${escapeText(`Unos minutos de vocabulario: ${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText('Hora de practicar inglés con OpenSpeak')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  // iCalendar exige CRLF.
  return `${lines.map(fold).join('\r\n')}\r\n`
}
