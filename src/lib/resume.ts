/**
 * Dónde lo dejaste: la última práctica por tu cuenta (mazo y modo) y cada lección, examen o quiz del
 * curso a medio hacer, con el ejercicio en que se quedó y lo respondido hasta ahí. Así el inicio
 * ofrece «continuar» y el curso se retoma exactamente donde se dejó, aunque se cierre la app.
 *
 * Es estado de este dispositivo y de corto plazo (no viaja en las copias): lo que importa a largo
 * plazo, las notas, vive en el progreso del curso.
 */
import type { CourseLevelId } from './courseMeta'
import { isCourseLevelId } from './courseMeta'
import type { Verdict } from './exercises'
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import { MODES, type Mode } from './types'
import { isFiniteNumber, isInteger, isRecord } from './validate'

/** La última práctica por tu cuenta: el mazo (`level-3`, `all`, `tema-comida`) y el modo. */
export interface PracticeSpot {
  deck: string
  mode: Mode
  at: number
}

/** Una tanda del curso a medio hacer. */
export interface CourseRun {
  /** `read`: abierta, leyendo la explicación; `practice`: haciendo los ejercicios. */
  step: 'read' | 'practice'
  /** Ejercicio en que se quedó (los anteriores ya están respondidos). */
  index: number
  verdicts: Verdict[]
  /** Quizzes: la semilla con que se armó (mismas preguntas al retomarlo). */
  seed?: number
  at: number
}

/** Qué tanda es: una lección, el examen o el quiz de un nivel, o el quiz mixto. */
export type RunTarget =
  | { kind: 'lesson'; level: CourseLevelId; lesson: string }
  | { kind: 'exam'; level: CourseLevelId }
  | { kind: 'quiz'; level: CourseLevelId | null }

export interface ResumeState {
  practice: PracticeSpot | null
  /** Clave: ver runKey. */
  runs: Record<string, CourseRun>
}

/** Las tandas sin tocar en este tiempo se olvidan: retomar algo de hace meses confunde más que ayuda. */
const RUN_TTL_MS = 60 * 24 * 60 * 60 * 1000

export function runKey(target: RunTarget): string {
  switch (target.kind) {
    case 'lesson':
      return `${target.level}/${target.lesson}`
    case 'exam':
      return `${target.level}/examen`
    case 'quiz':
      return `quiz/${target.level ?? 'mixto'}`
  }
}

/** La tanda que corresponde a una clave guardada; null si no es válida. */
export function parseRunKey(key: string): RunTarget | null {
  const [first, second] = key.split('/')
  if (!first || !second || key.split('/').length !== 2) return null
  if (first === 'quiz') {
    if (second === 'mixto') return { kind: 'quiz', level: null }
    return isCourseLevelId(second) ? { kind: 'quiz', level: second } : null
  }
  if (!isCourseLevelId(first)) return null
  if (second === 'examen') return { kind: 'exam', level: first }
  return /^[a-z0-9-]+$/.test(second) ? { kind: 'lesson', level: first, lesson: second } : null
}

const VERDICTS: readonly Verdict[] = ['correct', 'almost', 'wrong']
const isVerdict = (value: unknown): value is Verdict => VERDICTS.some((verdict) => verdict === value)

function parseRun(raw: unknown): CourseRun | null {
  if (!isRecord(raw) || (raw.step !== 'read' && raw.step !== 'practice') || !isFiniteNumber(raw.at)) return null
  if (!isInteger(raw.index, 0) || !Array.isArray(raw.verdicts) || !raw.verdicts.every(isVerdict)) return null
  // Lo respondido es justo lo anterior al ejercicio en curso.
  if (raw.verdicts.length !== raw.index) return null
  const run: CourseRun = { step: raw.step, index: raw.index, verdicts: raw.verdicts, at: raw.at }
  if (isInteger(raw.seed, 0)) run.seed = raw.seed
  return run
}

function parsePractice(raw: unknown): PracticeSpot | null {
  if (!isRecord(raw) || typeof raw.deck !== 'string' || !isFiniteNumber(raw.at)) return null
  const mode = MODES.find((m) => m === raw.mode)
  return mode ? { deck: raw.deck, mode, at: raw.at } : null
}

export function parseResume(raw: Record<string, unknown>, now = Date.now()): ResumeState {
  const runs: Record<string, CourseRun> = {}
  if (isRecord(raw.runs)) {
    for (const [key, value] of Object.entries(raw.runs)) {
      const run = parseRun(value)
      if (run && parseRunKey(key) && now - run.at < RUN_TTL_MS) runs[key] = run
    }
  }
  return { practice: parsePractice(raw.practice), runs }
}

const SCHEMA: VersionedSchema<ResumeState> = { version: 1, migrations: {}, parse: (raw) => parseResume(raw) }
const EMPTY: ResumeState = { practice: null, runs: {} }

const store = createPersistedStore<ResumeState>({ ...SCHEMA, key: 'tecla:resume', fallback: EMPTY })

export const useResume = () => useStore(store)
export const getResume = () => store.get()

/** Anota la práctica por tu cuenta en curso (al empezar una partida de un nivel, de todas o de un tema). */
export function rememberPractice(deck: string, mode: Mode, now = Date.now()) {
  const data = store.get()
  if (data.practice?.deck === deck && data.practice.mode === mode && now - data.practice.at < 60_000) return
  store.set({ ...data, practice: { deck, mode, at: now } })
}

/** Guarda por dónde va una tanda del curso. */
export function saveRun(target: RunTarget, run: Omit<CourseRun, 'at'>, now = Date.now()) {
  const data = store.get()
  store.set({ ...data, runs: { ...data.runs, [runKey(target)]: { ...run, at: now } } })
}

/** La tanda terminó (o se empezó de nuevo): ya no hay nada que retomar. */
export function clearRun(target: RunTarget) {
  const data = store.get()
  const key = runKey(target)
  if (!(key in data.runs)) return
  const runs = { ...data.runs }
  delete runs[key]
  store.set({ ...data, runs })
}

export const runOf = (state: ResumeState, target: RunTarget): CourseRun | null => state.runs[runKey(target)] ?? null

/** La tanda del curso tocada más recientemente, para «continuar donde lo dejaste». */
export function latestRun(state: ResumeState): { target: RunTarget; run: CourseRun } | null {
  let latest: { target: RunTarget; run: CourseRun } | null = null
  for (const [key, run] of Object.entries(state.runs)) {
    const target = parseRunKey(key)
    if (target && (!latest || run.at > latest.run.at)) latest = { target, run }
  }
  return latest
}

export function resetResume() {
  store.set(EMPTY)
}
