import { describe, expect, it } from 'vitest'
import { buildReminderIcs, isTime } from './reminder'

const NOW = new Date(2026, 8, 23, 10, 30).getTime()
const URL = 'https://tecla.example/'

describe('recordatorio diario', () => {
  it('valida la hora', () => {
    expect(['00:00', '20:00', '23:59'].every(isTime)).toBe(true)
    expect(['24:00', '9:00', '20:60', 'hola'].some(isTime)).toBe(false)
    expect(() => buildReminderIcs({ time: '25:00', url: URL, now: NOW })).toThrow('Hora no válida')
  })

  it('crea un evento diario a esa hora, desde hoy si aún no pasó', () => {
    const ics = buildReminderIcs({ time: '20:00', url: URL, now: NOW })
    expect(ics).toContain('DTSTART:20260923T200000\r\n')
    expect(ics).toContain('RRULE:FREQ=DAILY\r\n')
    expect(ics).toContain('BEGIN:VALARM\r\n')
    expect(ics).toContain(`URL:${URL}\r\n`)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('si la hora ya pasó hoy, empieza mañana', () => {
    expect(buildReminderIcs({ time: '08:15', url: URL, now: NOW })).toContain('DTSTART:20260924T081500')
  })

  it('escapa el texto y parte las líneas largas como pide iCalendar', () => {
    const ics = buildReminderIcs({
      time: '20:00',
      url: 'https://ejemplo.com/una/ruta/muy/larga/para/probar;el,escape',
      now: NOW,
    })
    expect(ics).toContain('\\;el\\,escape')
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true)
  })
})
