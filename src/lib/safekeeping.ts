/**
 * Cuidado del progreso guardado en el dispositivo: cuándo se hizo la última copia, si el navegador
 * lo protege frente a borrados y cuándo conviene recordarle al usuario que guarde una copia.
 */
import { useSyncExternalStore } from 'react'
import { isIOS, isStandalone } from './pwa'
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import { isFiniteNumber } from './validate'

const DAY = 24 * 60 * 60 * 1000
/** Safari borra los datos de una web no instalada tras 7 días sin visitarla. */
export const BACKUP_REMINDER_AFTER = 7 * DAY
/** "Más tarde" aplaza el aviso este tiempo. */
export const BACKUP_REMINDER_SNOOZE = 14 * DAY

export interface Safekeeping {
  lastBackupAt: number | null
  reminderSnoozedUntil: number | null
}

const EMPTY: Safekeeping = { lastBackupAt: null, reminderSnoozedUntil: null }

const SCHEMA: VersionedSchema<Safekeeping> = {
  version: 1,
  migrations: {},
  parse: (raw) => ({
    lastBackupAt: isFiniteNumber(raw.lastBackupAt) ? raw.lastBackupAt : null,
    reminderSnoozedUntil: isFiniteNumber(raw.reminderSnoozedUntil) ? raw.reminderSnoozedUntil : null,
  }),
}

const store = createPersistedStore<Safekeeping>({ ...SCHEMA, key: 'tecla:safekeeping', fallback: EMPTY })

export const useSafekeeping = () => useStore(store)

export function markBackupSaved(now = Date.now()) {
  store.set({ ...store.get(), lastBackupAt: now, reminderSnoozedUntil: null })
}

export function snoozeBackupReminder(now = Date.now()) {
  store.set({ ...store.get(), reminderSnoozedUntil: now + BACKUP_REMINDER_SNOOZE })
}

// --- Riesgo de borrado --------------------------------------------------------------------------

/** Safari de escritorio (Chrome, Edge, Firefox y Opera también dicen "Safari" en su user agent). */
const isDesktopSafari = () =>
  /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|fxios|edg|opr|android/i.test(navigator.userAgent)

/**
 * En iPhone, iPad y Safari, los datos de una web que no está instalada se borran tras 7 días sin
 * visitarla (Intelligent Tracking Prevention). Instalada en la pantalla de inicio no ocurre.
 */
export const storageAtRisk = () => typeof navigator !== 'undefined' && (isIOS() || isDesktopSafari()) && !isStandalone()

export interface ReminderInput {
  atRisk: boolean
  hasProgress: boolean
  safekeeping: Safekeeping
  now: number
}

export function needsBackupReminder({ atRisk, hasProgress, safekeeping, now }: ReminderInput): boolean {
  if (!atRisk || !hasProgress) return false
  if (safekeeping.reminderSnoozedUntil !== null && now < safekeeping.reminderSnoozedUntil) return false
  return safekeeping.lastBackupAt === null || now - safekeeping.lastBackupAt >= BACKUP_REMINDER_AFTER
}

// --- Almacenamiento persistente -----------------------------------------------------------------

export type Protection = 'unsupported' | 'protected' | 'unprotected'

let protection: Protection = 'unsupported'
const listeners = new Set<() => void>()
const setProtection = (next: Protection) => {
  protection = next
  for (const listener of listeners) listener()
}

const storageManager = () => (typeof navigator !== 'undefined' ? navigator.storage : undefined)

if (typeof navigator !== 'undefined') {
  void storageManager()
    ?.persisted?.()
    .then((persisted) => setProtection(persisted ? 'protected' : 'unprotected'))
}

/**
 * Pide al navegador que no borre los datos de OpenSpeak cuando necesite liberar espacio. Chrome, Edge y
 * Safari deciden sin preguntar; Firefox muestra un permiso, así que ahí solo se pide cuando el
 * usuario lo solicita (`interactive`).
 */
export async function requestProtection({ interactive }: { interactive: boolean }): Promise<Protection> {
  const manager = storageManager()
  if (!manager?.persist) return 'unsupported'
  if (!interactive && /firefox/i.test(navigator.userAgent)) return protection
  const granted = await manager.persist()
  setProtection(granted ? 'protected' : 'unprotected')
  return protection
}

export function useProtection(): Protection {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => protection,
    () => 'unsupported',
  )
}
