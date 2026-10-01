/**
 * Progreso del curso: la mejor nota de cada lección y de cada examen. Se guarda aparte del progreso
 * de vocabulario (otra forma de practicar, otro ritmo) y viaja en la copia de seguridad.
 */
import { addXp } from './progress'
import { COURSE_LEVELS, type CourseLevelId, EXAM_PASS, isCourseLevelId } from './courseMeta'
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import { isFiniteNumber, isRecord } from './validate'

export interface Attempt {
  /** Mejor acierto (0–1). */
  best: number
  /** Cuándo se consiguió. */
  at: number
}

export interface CourseProgress {
  /** Clave `${nivel}/${lección}`. */
  lessons: Record<string, Attempt>
  exams: Partial<Record<CourseLevelId, Attempt>>
}

/** Experiencia por cada ejercicio acertado, por terminar una lección y por aprobar un examen. */
export const XP_EXERCISE = 10
export const XP_LESSON = 30
export const XP_EXAM = 100

export const lessonKey = (level: CourseLevelId, lesson: string) => `${level}/${lesson}`

function parseAttempt(raw: unknown): Attempt | null {
  if (!isRecord(raw) || !isFiniteNumber(raw.best) || !isFiniteNumber(raw.at)) return null
  return { best: Math.min(1, Math.max(0, raw.best)), at: raw.at }
}

export function parseCourseProgress(raw: unknown): CourseProgress {
  const lessons: Record<string, Attempt> = {}
  const exams: CourseProgress['exams'] = {}
  if (isRecord(raw)) {
    if (isRecord(raw.lessons)) {
      for (const [key, value] of Object.entries(raw.lessons)) {
        const [level, lesson] = key.split('/')
        const attempt = parseAttempt(value)
        if (attempt && level && isCourseLevelId(level) && lesson) lessons[key] = attempt
      }
    }
    if (isRecord(raw.exams)) {
      for (const [level, value] of Object.entries(raw.exams)) {
        const attempt = parseAttempt(value)
        if (attempt && isCourseLevelId(level)) exams[level] = attempt
      }
    }
  }
  return { lessons, exams }
}

export const EMPTY_COURSE: CourseProgress = { lessons: {}, exams: {} }

export const COURSE_SCHEMA: VersionedSchema<CourseProgress> = {
  version: 1,
  migrations: {},
  parse: parseCourseProgress,
}

const store = createPersistedStore<CourseProgress>({ ...COURSE_SCHEMA, key: 'tecla:course', fallback: EMPTY_COURSE })

export const useCourseProgress = () => useStore(store)
export const getCourseProgress = () => store.get()

/** La mejor nota manda; a igual nota, la más antigua (cuándo se consiguió de verdad). */
function better(current: Attempt | undefined, incoming: Attempt): Attempt {
  if (!current) return incoming
  if (incoming.best > current.best) return incoming
  if (incoming.best === current.best && incoming.at < current.at) return incoming
  return current
}

/**
 * Anota una lección terminada y suma la experiencia: los ejercicios acertados siempre; el premio
 * por terminarla, solo la primera vez (repetirla para afianzar no lo cobra dos veces).
 */
export function recordLesson(level: CourseLevelId, lesson: string, correct: number, ratio: number, now = Date.now()) {
  const data = store.get()
  const key = lessonKey(level, lesson)
  const first = !(key in data.lessons)
  store.set({ ...data, lessons: { ...data.lessons, [key]: better(data.lessons[key], { best: ratio, at: now }) } })
  addXp(correct * XP_EXERCISE + (first ? XP_LESSON : 0))
}

/** Anota un examen y suma la experiencia: los aciertos siempre; aprobar, solo la primera vez. */
export function recordExam(level: CourseLevelId, correct: number, ratio: number, now = Date.now()): boolean {
  const data = store.get()
  const passed = ratio >= EXAM_PASS
  const firstPass = passed && !((data.exams[level]?.best ?? 0) >= EXAM_PASS)
  store.set({ ...data, exams: { ...data.exams, [level]: better(data.exams[level], { best: ratio, at: now }) } })
  addXp(correct * XP_EXERCISE + (firstPass ? XP_EXAM : 0))
  return passed
}

export const examPassed = (progress: CourseProgress, level: CourseLevelId) =>
  (progress.exams[level]?.best ?? 0) >= EXAM_PASS

export function replaceCourseProgress(next: CourseProgress) {
  store.set(next)
}

export function resetCourseProgress() {
  store.set(EMPTY_COURSE)
}

/** Dos progresos en uno: de cada lección y examen, la mejor nota. */
export function mergeCourseProgress(current: CourseProgress, incoming: CourseProgress): CourseProgress {
  const lessons = { ...current.lessons }
  for (const [key, attempt] of Object.entries(incoming.lessons)) lessons[key] = better(lessons[key], attempt)
  const exams = { ...current.exams }
  for (const level of COURSE_LEVELS) {
    const attempt = incoming.exams[level.id]
    if (attempt) exams[level.id] = better(exams[level.id], attempt)
  }
  return { lessons, exams }
}

/** Resumen de un nivel: lecciones terminadas y si el examen está aprobado. */
export function levelSummary(progress: CourseProgress, level: CourseLevelId, lessonIds: readonly string[]) {
  const done = lessonIds.filter((id) => id in progress.lessons).length
  return { done, total: lessonIds.length, passed: examPassed(progress, level), exam: progress.exams[level] ?? null }
}
