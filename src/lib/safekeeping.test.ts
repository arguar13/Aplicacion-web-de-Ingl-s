import { describe, expect, it } from 'vitest'
import { BACKUP_REMINDER_AFTER, needsBackupReminder, type ReminderInput } from './safekeeping'

const NOW = new Date(2026, 8, 27, 10).getTime()
const DAY = 24 * 60 * 60 * 1000
const base: ReminderInput = {
  atRisk: true,
  hasProgress: true,
  safekeeping: { lastBackupAt: null, reminderSnoozedUntil: null },
  now: NOW,
}

describe('aviso de copia de seguridad', () => {
  it('avisa en Safari sin instalar si hay progreso y nunca se guardó una copia', () => {
    expect(needsBackupReminder(base)).toBe(true)
  })

  it('no avisa donde los datos no corren peligro ni sin progreso que perder', () => {
    expect(needsBackupReminder({ ...base, atRisk: false })).toBe(false)
    expect(needsBackupReminder({ ...base, hasProgress: false })).toBe(false)
  })

  it('no vuelve a avisar hasta que la última copia tenga una semana', () => {
    const recent = { lastBackupAt: NOW - BACKUP_REMINDER_AFTER + DAY, reminderSnoozedUntil: null }
    const old = { lastBackupAt: NOW - BACKUP_REMINDER_AFTER, reminderSnoozedUntil: null }
    expect(needsBackupReminder({ ...base, safekeeping: recent })).toBe(false)
    expect(needsBackupReminder({ ...base, safekeeping: old })).toBe(true)
  })

  it('"más tarde" lo aplaza hasta la fecha indicada', () => {
    const snoozed = { lastBackupAt: null, reminderSnoozedUntil: NOW + DAY }
    expect(needsBackupReminder({ ...base, safekeeping: snoozed })).toBe(false)
    expect(needsBackupReminder({ ...base, safekeeping: snoozed, now: NOW + DAY })).toBe(true)
  })
})
