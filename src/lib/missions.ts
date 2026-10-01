/**
 * Misiones del día: tres retos pequeños que cambian cada día (los mismos en cualquier dispositivo:
 * salen de la fecha) y dan experiencia al cumplirse. Su avance se calcula de lo practicado hoy; en
 * el progreso solo se anota cuáles se premiaron ya, para no premiarlas dos veces.
 */
import { useSyncExternalStore } from 'react'
import { getEvents, type StudyEvent, subscribeEvents } from './events'
import {
  completeMissions,
  dayKey,
  type DayStats,
  getProgress,
  type ProgressData,
  subscribeProgress,
  todayStats,
} from './progress'
import { daySeed, seededRng } from './seed'
import { getSettings, subscribeSettings } from './settings'
import { shuffle } from './quiz'

export const MISSIONS_PER_DAY = 3

export interface MissionInput {
  /** Lo practicado hoy. */
  today: DayStats
  /** Respuestas de hoy, en orden. */
  events: readonly StudyEvent[]
  dailyGoal: number
}

export interface Mission {
  id: string
  title: string
  description: string
  /** Experiencia que da al cumplirse. */
  xp: number
  /** Cuánto se lleva y cuánto hace falta. */
  measure: (input: MissionInput) => { value: number; target: number }
}

/** Respuestas seguidas a la primera más largas de hoy. */
export function longestCleanRun(events: readonly StudyEvent[]): number {
  let best = 0
  let run = 0
  for (const event of events) {
    run = event.r === 'clean' ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

const countMission = (
  id: string,
  title: string,
  description: string,
  xp: number,
  target: number,
  count: (input: MissionInput) => number,
): Mission => ({ id, title, description, xp, measure: (input) => ({ value: Math.min(count(input), target), target }) })

/** Todas las misiones posibles; cada día se eligen tres. */
export const MISSION_CATALOG: readonly Mission[] = [
  countMission('answers-25', 'Calentamiento', 'Responde 25 palabras.', 40, 25, ({ today }) => today.answers),
  countMission('answers-60', 'Maratón', 'Responde 60 palabras.', 90, 60, ({ today }) => today.answers),
  countMission('fresh-5', 'Descubridora', 'Aprende 5 palabras nuevas.', 50, 5, ({ today }) => today.fresh),
  countMission('fresh-10', 'Exploración', 'Aprende 10 palabras nuevas.', 80, 10, ({ today }) => today.fresh),
  countMission('run-10', 'Sin fallar', 'Acierta 10 seguidas a la primera.', 60, 10, ({ events }) =>
    longestCleanRun(events),
  ),
  countMission('run-20', 'Imparable', 'Acierta 20 seguidas a la primera.', 100, 20, ({ events }) =>
    longestCleanRun(events),
  ),
  countMission(
    'reviews-15',
    'Memoria fresca',
    'Repasa 15 palabras que ya conocías.',
    50,
    15,
    ({ events }) => events.filter((event) => !event.f).length,
  ),
  countMission(
    'listen-8',
    'Buen oído',
    'Responde 8 palabras de oído (escuchar o dictado).',
    50,
    8,
    ({ events }) => events.filter((event) => event.track === 'listen').length,
  ),
  countMission(
    'type-8',
    'Buena letra',
    'Escribe 8 palabras (escribir o dictado).',
    50,
    8,
    ({ events }) => events.filter((event) => event.track === 'type').length,
  ),
  countMission(
    'recall-10',
    'De memoria',
    'Responde 10 palabras de español a inglés.',
    50,
    10,
    ({ events }) => events.filter((event) => event.track === 'es-en').length,
  ),
  countMission('minutes-10', 'Diez minutos', 'Practica 10 minutos.', 60, 10, ({ today }) =>
    Math.floor(today.ms / 60_000),
  ),
  {
    id: 'accuracy-90',
    title: 'Puntería',
    description: 'Acierta a la primera el 90 % de 20 palabras o más.',
    xp: 70,
    measure: ({ today }) => {
      // Hasta llegar a 20 respuestas cuenta cuántas van; después, el acierto (hasta el 90 %).
      if (today.answers < 20) return { value: today.answers, target: 20 }
      const accuracy = Math.round((today.clean / today.answers) * 100)
      return { value: Math.min(accuracy, 90), target: 90 }
    },
  },
]

/** Las misiones del día: tres distintas, elegidas por la fecha. */
export function dailyMissions(day: string): Mission[] {
  return shuffle(MISSION_CATALOG, seededRng(daySeed(day))).slice(0, MISSIONS_PER_DAY)
}

export interface MissionStatus {
  mission: Mission
  value: number
  target: number
  done: boolean
}

export function evaluateMissions(day: string, input: MissionInput): MissionStatus[] {
  return dailyMissions(day).map((mission) => {
    const { value, target } = mission.measure(input)
    return { mission, value, target, done: value >= target }
  })
}

/** Lo que hace falta para evaluar las misiones de hoy, a partir de lo guardado. */
export function missionInput(progress: ProgressData, events: readonly StudyEvent[], now: number): MissionInput {
  const day = dayKey(now)
  return {
    today: todayStats(progress, now),
    events: events.filter((event) => dayKey(event.t) === day),
    dailyGoal: getSettings().dailyGoal,
  }
}

// --- Premios y avisos -------------------------------------------------------------------------------

let announcements: Mission[] = []
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}

/**
 * Comprueba las misiones de hoy y premia (una sola vez) las recién cumplidas; devuelve cuáles. La
 * primera vez tras una sesión larga sin la app abierta puede premiar varias de golpe.
 */
export function settleMissions(now = Date.now()): Mission[] {
  const progress = getProgress()
  const day = dayKey(now)
  const done = progress.missions.day === day ? progress.missions.done : []
  const fresh = evaluateMissions(day, missionInput(progress, getEvents(), now))
    .filter((status) => status.done && !done.includes(status.mission.id))
    .map((status) => status.mission)
  if (fresh.length === 0) return []
  completeMissions(
    day,
    fresh.map((mission) => mission.id),
    fresh.reduce((sum, mission) => sum + mission.xp, 0),
  )
  return fresh
}

function checkMissions() {
  const fresh = settleMissions()
  if (fresh.length > 0) {
    announcements = [...announcements, ...fresh]
    emit()
  }
}

/** Vigila la práctica y encola cada misión cumplida para anunciarla. Devuelve cómo dejar de vigilar. */
export function watchMissions(): () => void {
  const check = checkMissions
  check()
  const stops = [subscribeProgress(check), subscribeEvents(check), subscribeSettings(check)]
  return () => {
    for (const stop of stops) stop()
  }
}

/** La misión cumplida que toca anunciar (la primera de la cola). */
export function useMissionAnnouncement(): Mission | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => announcements[0],
    () => undefined,
  )
}

export function dismissMissionAnnouncement() {
  announcements = announcements.slice(1)
  emit()
}
