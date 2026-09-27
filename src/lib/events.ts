/**
 * Historial de estudio: una entrada compacta por respuesta, para las estadísticas y la ficha de cada
 * palabra. Se guardan las últimas MAX_EVENTS (unos 250 KB); lo agregado por día vive en el progreso.
 */
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import { type Track, TRACKS } from './types'
import { isFiniteNumber, isRecord } from './validate'

export const MAX_EVENTS = 5000

/** Resultado: a la primera, "casi" (modo escribir) o con fallos. */
export type EventResult = 'clean' | 'almost' | 'miss'

export interface StudyEvent {
  /** Momento (ms). */
  t: number
  /** Palabra. */
  id: string
  track: Track
  r: EventResult
  /** Tiempo hasta acertar (ms). */
  ms: number
}

const RESULTS: readonly EventResult[] = ['clean', 'almost', 'miss']

export function parseEvent(raw: unknown): StudyEvent | null {
  if (!isRecord(raw)) return null
  const { t, id, track, r, ms } = raw
  const knownTrack = TRACKS.find((known) => known === track)
  const result = RESULTS.find((known) => known === r)
  if (!isFiniteNumber(t) || typeof id !== 'string' || !knownTrack || !result || !isFiniteNumber(ms)) return null
  return { t, id, track: knownTrack, r: result, ms }
}

export function parseEvents(raw: unknown): StudyEvent[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(parseEvent)
    .filter((event): event is StudyEvent => event !== null)
    .toSorted((a, b) => a.t - b.t)
    .slice(-MAX_EVENTS)
}

interface EventLog {
  events: StudyEvent[]
}

export const EVENTS_SCHEMA: VersionedSchema<EventLog> = {
  version: 1,
  migrations: {},
  parse: (raw) => ({ events: parseEvents(raw.events) }),
}

const store = createPersistedStore<EventLog>({ ...EVENTS_SCHEMA, key: 'tecla:events', fallback: { events: [] } })

export const useEvents = () => useStore(store).events
export const getEvents = () => store.get().events

export function appendEvent(event: StudyEvent) {
  const { events } = store.get()
  store.set({ events: [...events, event].slice(-MAX_EVENTS) })
}

export function replaceEvents(events: StudyEvent[]) {
  store.set({ events: parseEvents(events) })
}

/** Une dos historiales sin duplicar (la misma palabra y habilidad en el mismo instante es la misma respuesta). */
export function mergeEvents(current: readonly StudyEvent[], incoming: readonly StudyEvent[]): StudyEvent[] {
  const seen = new Set(current.map((e) => `${e.t}:${e.track}:${e.id}`))
  return parseEvents([...current, ...incoming.filter((e) => !seen.has(`${e.t}:${e.track}:${e.id}`))])
}

export function clearEvents() {
  store.set({ events: [] })
}
