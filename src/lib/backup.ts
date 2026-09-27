/**
 * Copias de seguridad del progreso en un archivo JSON: para no perderlo (Safari borra los datos de
 * las webs no instaladas tras 7 días sin visitarlas) y para pasarlo a otro dispositivo.
 */
import { parseEvents, type StudyEvent } from './events'
import { dayKey, PROGRESS_SCHEMA, type ProgressData } from './progress'
import { isMastered } from './scheduler'
import { SETTINGS_SCHEMA, type Settings } from './settings'
import { readVersioned } from './store'
import { isRecord } from './validate'

const FORMAT = 'tecla-copia'
const FORMAT_VERSION = 1
/** Una copia real ocupa como mucho unos cientos de KB; esto descarta archivos equivocados. */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export interface Backup {
  exportedAt: number
  progress: ProgressData
  settings: Settings
  /** Historial de respuestas (desde la Fase 10; las copias anteriores no lo traen). */
  events: StudyEvent[]
}

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; error: string }

export function serializeBackup(
  progress: ProgressData,
  settings: Settings,
  events: readonly StudyEvent[],
  now = Date.now(),
): string {
  return JSON.stringify(
    {
      format: FORMAT,
      version: FORMAT_VERSION,
      exportedAt: new Date(now).toISOString(),
      progress: { version: PROGRESS_SCHEMA.version, ...progress },
      settings: { version: SETTINGS_SCHEMA.version, ...settings },
      events,
    },
    null,
    1,
  )
}

export const backupFileName = (now = Date.now()) => `tecla-copia-${dayKey(now)}.json`

const NEWER = 'Esta copia es de una versión más nueva de Tecla. Actualiza la app para restaurarla.'

export function parseBackup(text: string): ParsedBackup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El archivo está dañado o no es una copia de Tecla.' }
  }
  if (!isRecord(data) || data.format !== FORMAT) return { ok: false, error: 'Este archivo no es una copia de Tecla.' }
  if (typeof data.version !== 'number' || data.version > FORMAT_VERSION) return { ok: false, error: NEWER }

  const progress = readVersioned(data.progress, PROGRESS_SCHEMA)
  const settings = readVersioned(isRecord(data.settings) ? data.settings : {}, SETTINGS_SCHEMA)
  if (progress.status === 'newer' || settings.status === 'newer') return { ok: false, error: NEWER }
  if (progress.status === 'invalid') return { ok: false, error: 'La copia no contiene un progreso válido.' }

  const exportedAt = typeof data.exportedAt === 'string' ? Date.parse(data.exportedAt) : Number.NaN
  return {
    ok: true,
    backup: {
      exportedAt: Number.isNaN(exportedAt) ? 0 : exportedAt,
      progress: progress.value,
      settings: settings.status === 'ok' ? settings.value : SETTINGS_SCHEMA.parse({}),
      events: parseEvents(data.events),
    },
  }
}

export interface ProgressOverview {
  /** Palabras distintas practicadas en algún sentido. */
  words: number
  /** Palabras distintas dominadas en algún sentido. */
  mastered: number
  days: number
  bestStreak: number
}

export function describeProgress(progress: ProgressData): ProgressOverview {
  const words = new Set<string>()
  const mastered = new Set<string>()
  for (const [key, card] of Object.entries(progress.cards)) {
    const id = key.slice(key.indexOf(':') + 1)
    words.add(id)
    if (isMastered(card)) mastered.add(id)
  }
  return { words: words.size, mastered: mastered.size, days: progress.days.length, bestStreak: progress.bestStreak }
}
