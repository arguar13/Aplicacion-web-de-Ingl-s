/**
 * Contenido del curso: lecciones con explicación, ejemplos y ejercicios, y un examen por nivel.
 * Cada nivel es un JSON aparte (src/data/course/<nivel>.json) que se valida al cargarlo: una
 * entrada dañada se descarta sin arrastrar al resto.
 */
import a1Url from '@/data/course/a1.json?url'
import a2Url from '@/data/course/a2.json?url'
import b1Url from '@/data/course/b1.json?url'
import b2Url from '@/data/course/b2.json?url'
import c1Url from '@/data/course/c1.json?url'
import c2Url from '@/data/course/c2.json?url'
import { useSyncExternalStore } from 'react'
import { COURSE_LEVELS, type CourseLevelId } from './courseMeta'
import { isInteger, isRecord } from './validate'

export interface Example {
  en: string
  es: string
}

/** Una parte de la explicación de una lección. */
export interface Section {
  heading: string
  /** Párrafos. */
  body: string[]
  examples?: Example[]
  table?: { headers: string[]; rows: string[][] }
  /** Un consejo o un error frecuente, destacado. */
  tip?: string
}

export type Exercise =
  /** Elegir una opción. */
  | { type: 'choice'; prompt: string; options: string[]; answer: number; explanation?: string }
  /** Completar el hueco (___) escribiendo; vale cualquiera de las respuestas. */
  | { type: 'fill'; prompt: string; answers: string[]; explanation?: string }
  /** Ordenar las palabras para formar la frase (se guardan en el orden correcto). */
  | { type: 'order'; es: string; words: string[]; explanation?: string }
  /** Traducir la frase al inglés; vale cualquiera de las respuestas. */
  | { type: 'translate'; es: string; answers: string[]; explanation?: string }

export type ExerciseType = Exercise['type']

export interface Lesson {
  id: string
  title: string
  summary: string
  sections: Section[]
  exercises: Exercise[]
}

export interface CourseLevel {
  id: CourseLevelId
  intro: string
  goals: string[]
  lessons: Lesson[]
  exam: Exercise[]
}

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString)
const SLUG = /^[a-z0-9-]+$/

export function parseExample(raw: unknown): Example | null {
  return isRecord(raw) && isString(raw.en) && isString(raw.es) ? { en: raw.en, es: raw.es } : null
}

export function parseSection(raw: unknown): Section | null {
  if (!isRecord(raw) || !isString(raw.heading) || !isStringList(raw.body)) return null
  const section: Section = { heading: raw.heading, body: raw.body }
  if (Array.isArray(raw.examples)) {
    const examples = raw.examples.map(parseExample).filter((example): example is Example => example !== null)
    if (examples.length > 0) section.examples = examples
  }
  if (isRecord(raw.table) && isStringList(raw.table.headers) && Array.isArray(raw.table.rows)) {
    const width = raw.table.headers.length
    const rows = raw.table.rows.filter((row): row is string[] => isStringList(row) && row.length === width)
    if (rows.length > 0) section.table = { headers: raw.table.headers, rows }
  }
  if (isString(raw.tip)) section.tip = raw.tip
  return section
}

export function parseExercise(raw: unknown): Exercise | null {
  if (!isRecord(raw)) return null
  const explanation = isString(raw.explanation) ? { explanation: raw.explanation } : {}
  switch (raw.type) {
    case 'choice':
      if (!isString(raw.prompt) || !isStringList(raw.options) || raw.options.length < 2) return null
      if (!isInteger(raw.answer, 0, raw.options.length - 1)) return null
      return { type: 'choice', prompt: raw.prompt, options: raw.options, answer: raw.answer, ...explanation }
    case 'fill':
      if (!isString(raw.prompt) || !raw.prompt.includes('___') || !isStringList(raw.answers)) return null
      return { type: 'fill', prompt: raw.prompt, answers: raw.answers, ...explanation }
    case 'order':
      if (!isString(raw.es) || !isStringList(raw.words) || raw.words.length < 2) return null
      return { type: 'order', es: raw.es, words: raw.words, ...explanation }
    case 'translate':
      if (!isString(raw.es) || !isStringList(raw.answers)) return null
      return { type: 'translate', es: raw.es, answers: raw.answers, ...explanation }
    default:
      return null
  }
}

const parseExercises = (raw: unknown): Exercise[] =>
  Array.isArray(raw) ? raw.map(parseExercise).filter((exercise): exercise is Exercise => exercise !== null) : []

export function parseLesson(raw: unknown): Lesson | null {
  if (!isRecord(raw) || !isString(raw.id) || !SLUG.test(raw.id) || !isString(raw.title) || !isString(raw.summary))
    return null
  const sections = Array.isArray(raw.sections)
    ? raw.sections.map(parseSection).filter((section): section is Section => section !== null)
    : []
  const exercises = parseExercises(raw.exercises)
  if (sections.length === 0 || exercises.length === 0) return null
  return { id: raw.id, title: raw.title, summary: raw.summary, sections, exercises }
}

/** Valida un nivel del curso. Las lecciones con el id repetido se quedan con la primera. */
export function parseCourseLevel(id: CourseLevelId, raw: unknown): CourseLevel {
  if (!isRecord(raw)) return { id, intro: '', goals: [], lessons: [], exam: [] }
  const seen = new Set<string>()
  const lessons: Lesson[] = []
  for (const entry of Array.isArray(raw.lessons) ? raw.lessons : []) {
    const lesson = parseLesson(entry)
    if (lesson && !seen.has(lesson.id)) {
      seen.add(lesson.id)
      lessons.push(lesson)
    }
  }
  return {
    id,
    intro: isString(raw.intro) ? raw.intro : '',
    goals: isStringList(raw.goals) ? raw.goals : [],
    lessons,
    exam: parseExercises(raw.exam),
  }
}

// --- Carga diferida -------------------------------------------------------------------------------

const URLS: Record<CourseLevelId, string> = { a1: a1Url, a2: a2Url, b1: b1Url, b2: b2Url, c1: c1Url, c2: c2Url }

export type LevelState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; level: CourseLevel }

const LOADING: LevelState = { status: 'loading' }
const FAILED: LevelState = { status: 'error' }
const states = new Map<CourseLevelId, LevelState>()
const pending = new Map<CourseLevelId, Promise<CourseLevel>>()
const listeners = new Set<() => void>()
/** Estado de todos los niveles, en el orden de COURSE_LEVELS; se rehace solo cuando algo cambia. */
let all: LevelState[] = COURSE_LEVELS.map(() => LOADING)
const emit = () => {
  all = COURSE_LEVELS.map((info) => states.get(info.id) ?? LOADING)
  for (const listener of listeners) listener()
}

/** Carga (una sola vez) el contenido de un nivel. Si falla la red, se reintenta en la próxima petición. */
export function loadCourseLevel(id: CourseLevelId): Promise<CourseLevel> {
  const current = states.get(id)
  if (current?.status === 'ready') return Promise.resolve(current.level)
  let request = pending.get(id)
  if (!request) {
    request = fetch(URLS[id])
      .then((response) => {
        if (!response.ok) throw new Error(`No se pudo cargar el nivel ${id} (HTTP ${response.status})`)
        return response.json() as Promise<unknown>
      })
      .then((raw) => {
        const level = parseCourseLevel(id, raw)
        states.set(id, { status: 'ready', level })
        emit()
        return level
      })
      .catch((error: unknown) => {
        states.set(id, FAILED)
        emit()
        throw error
      })
      .finally(() => pending.delete(id))
    pending.set(id, request)
  }
  return request
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * El contenido de un nivel; mientras carga, `loading`; si no se pudo (sin conexión y sin caché),
 * `error` hasta que se pida de nuevo (ver retryCourseLevel). Pedirlo empieza la carga.
 */
export function useCourseLevel(id: CourseLevelId): LevelState {
  const state = useSyncExternalStore(
    subscribe,
    () => states.get(id) ?? LOADING,
    () => LOADING,
  )
  if (!states.has(id)) loadCourseLevel(id).catch(() => undefined)
  return state
}

/** El estado de todos los niveles (para el quiz mixto). Pedirlos empieza la carga de los que falten. */
export function useAllCourseLevels(): LevelState[] {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => all,
    () => all,
  )
  for (const info of COURSE_LEVELS) if (!states.has(info.id)) loadCourseLevel(info.id).catch(() => undefined)
  return snapshot
}

/** Vuelve a intentar la carga de un nivel que falló. */
export function retryCourseLevel(id: CourseLevelId) {
  if (states.get(id)?.status === 'error') states.delete(id)
  loadCourseLevel(id).catch(() => undefined)
}

/** Para tests y herramientas: fija el contenido de un nivel sin pasar por la red. */
export function setCourseLevel(level: CourseLevel) {
  states.set(level.id, { status: 'ready', level })
  emit()
}
