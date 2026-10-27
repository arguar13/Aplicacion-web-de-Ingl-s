/**
 * Planes de estudio personalizados. Se elige un programa (un objetivo: viajar, trabajar, una
 * certificación…), el nivel de partida y el de llegada, y cuánto tiempo se le dedica; de ahí sale
 * un plan semana a semana con las lecciones del curso y, cada día, unas pocas tareas concretas
 * (vocabulario, la lección que toca, un texto para escuchar, uno para leer en voz alta).
 *
 * Todo se calcula a partir de lo que ya se guarda (progreso del curso, de los textos y del día): en
 * `tecla:plan` solo vive la configuración elegida. Así el plan nunca se desincroniza de lo hecho.
 */
import { COURSE_LEVELS, type CourseLevelId, isCourseLevelId } from './courseMeta'
import { dayKey } from './progress'
import { DAILY_GOALS, type DailyGoal, type NewPerDay } from './settings'
import { createPersistedStore, useStore, type VersionedSchema } from './store'
import type { TopicId } from './topicMeta'
import { isFiniteNumber, isRecord } from './validate'

export const PROGRAM_IDS = ['complete', 'travel', 'work', 'exam', 'conversation', 'zero'] as const
export type ProgramId = (typeof PROGRAM_IDS)[number]

/** En qué se reparte el tiempo de estudio (suman 1). */
export interface Shares {
  course: number
  vocabulary: number
  listening: number
  speaking: number
}

export interface Program {
  id: ProgramId
  name: string
  /** Una línea: para qué sirve. */
  tagline: string
  description: string
  /** Niveles que propone por defecto. */
  from: CourseLevelId
  to: CourseLevelId
  shares: Shares
  /** Colecciones de vocabulario en las que insiste (en días alternos, en lugar de la sesión). */
  topics: readonly TopicId[]
  /** Temas de los textos que recomienda primero. */
  textTopics: readonly string[]
  /** Lo que incluye, en corto, para la tarjeta del programa. */
  highlights: readonly string[]
}

export const PROGRAMS: Record<ProgramId, Program> = {
  complete: {
    id: 'complete',
    name: 'Inglés completo',
    tagline: 'Gramática, vocabulario, oído y pronunciación, en equilibrio.',
    description:
      'El camino de un buen curso presencial: avanzas por el temario del Marco Común Europeo y cada día repartes el tiempo entre las cuatro destrezas.',
    from: 'a1',
    to: 'c1',
    shares: { course: 0.45, vocabulary: 0.3, listening: 0.13, speaking: 0.12 },
    topics: [],
    textTopics: [],
    highlights: ['Todo el curso hasta C1', 'Las cuatro destrezas', 'Exámenes por nivel'],
  },
  travel: {
    id: 'travel',
    name: 'Viajar con confianza',
    tagline: 'Hoteles, transporte, restaurantes y conversaciones de viaje.',
    description:
      'Para desenvolverte en un viaje: vocabulario de transporte, lugares y comida, mucho oído y frases para decir en voz alta, con la gramática justa.',
    from: 'a1',
    to: 'b1',
    shares: { course: 0.32, vocabulary: 0.3, listening: 0.2, speaking: 0.18 },
    topics: ['transporte', 'lugares', 'comida'],
    textTopics: ['Viajes', 'Lugares', 'Vida diaria'],
    highlights: ['Colecciones de viaje', 'Mucha escucha', 'Hasta B1'],
  },
  work: {
    id: 'work',
    name: 'Inglés para el trabajo',
    tagline: 'Reuniones, correos, entrevistas y negociación.',
    description:
      'Para usar el inglés en tu profesión: el curso hasta B2, vocabulario de dinero, sociedad y comunicación, y textos sobre empresas y entrevistas.',
    from: 'a2',
    to: 'b2',
    shares: { course: 0.45, vocabulary: 0.3, listening: 0.12, speaking: 0.13 },
    topics: ['dinero', 'comunicacion', 'sociedad'],
    textTopics: ['Trabajo', 'Tecnología', 'Sociedad'],
    highlights: ['Hasta B2', 'Vocabulario profesional', 'Entrevistas y reuniones'],
  },
  exam: {
    id: 'exam',
    name: 'Preparar una certificación',
    tagline: 'B1 Preliminary, B2 First o C1 Advanced: el temario oficial.',
    description:
      'Para aprobar un examen oficial: el temario completo de cada nivel, sus exámenes de práctica y quizzes de repaso, con lectura y escucha de nivel.',
    from: 'b1',
    to: 'c1',
    shares: { course: 0.58, vocabulary: 0.25, listening: 0.1, speaking: 0.07 },
    topics: [],
    textTopics: ['Ciencia', 'Sociedad', 'Cultura'],
    highlights: ['Temario oficial', 'Exámenes de práctica', 'Hasta C1'],
  },
  conversation: {
    id: 'conversation',
    name: 'Hablar con fluidez',
    tagline: 'Entrena el oído y la pronunciación todos los días.',
    description:
      'Para soltarte al hablar: escuchas y lees en voz alta a diario, con el micrófono como profesor, y el curso afianza las estructuras que usas.',
    from: 'a2',
    to: 'b2',
    shares: { course: 0.28, vocabulary: 0.24, listening: 0.24, speaking: 0.24 },
    topics: ['comunicacion', 'emociones', 'personas'],
    textTopics: [],
    highlights: ['Escucha y habla a diario', 'Pronunciación con tu voz', 'Hasta B2'],
  },
  zero: {
    id: 'zero',
    name: 'Desde cero',
    tagline: 'Tus primeras mil palabras y la gramática básica, sin prisa.',
    description:
      'Si empiezas de cero: lo esencial de A1 y A2 paso a paso, mucho vocabulario de uso diario y textos cortos para acostumbrar el oído.',
    from: 'a1',
    to: 'a2',
    shares: { course: 0.42, vocabulary: 0.4, listening: 0.12, speaking: 0.06 },
    topics: ['comida', 'personas', 'tiempo'],
    textTopics: ['Vida diaria', 'Personas'],
    highlights: ['A1 y A2', 'Vocabulario básico', 'A tu ritmo'],
  },
}

export const isProgramId = (value: unknown): value is ProgramId =>
  typeof value === 'string' && (PROGRAM_IDS as readonly string[]).includes(value)

/** Minutos al día y días por semana que se pueden elegir. */
export const PLAN_MINUTES = [10, 20, 30, 45, 60] as const
export type PlanMinutes = (typeof PLAN_MINUTES)[number]
export const PLAN_DAYS = [3, 4, 5, 6, 7] as const
export type PlanDays = (typeof PLAN_DAYS)[number]

export interface StudyPlan {
  program: ProgramId
  from: CourseLevelId
  to: CourseLevelId
  minutes: PlanMinutes
  days: PlanDays
  /** Cuándo empezó (de ahí sale en qué semana va). */
  startedAt: number
}

// --- Almacén --------------------------------------------------------------------------------------

const levelIndex = (id: CourseLevelId) => COURSE_LEVELS.findIndex((level) => level.id === id)

const oneOf = <T extends number>(options: readonly T[], value: unknown): T | undefined =>
  options.find((option) => option === value)

export function parsePlan(raw: unknown): StudyPlan | null {
  if (!isRecord(raw)) return null
  const { program, from, to, minutes, days, startedAt } = raw
  const m = oneOf(PLAN_MINUTES, minutes)
  const d = oneOf(PLAN_DAYS, days)
  if (!isProgramId(program) || typeof from !== 'string' || typeof to !== 'string') return null
  if (!isCourseLevelId(from) || !isCourseLevelId(to) || levelIndex(to) < levelIndex(from)) return null
  if (m === undefined || d === undefined || !isFiniteNumber(startedAt)) return null
  return { program, from, to, minutes: m, days: d, startedAt }
}

interface PlanState {
  plan: StudyPlan | null
}

export const PLAN_SCHEMA: VersionedSchema<PlanState> = {
  version: 1,
  migrations: {},
  parse: (raw) => ({ plan: parsePlan(raw.plan) }),
}

const store = createPersistedStore<PlanState>({ ...PLAN_SCHEMA, key: 'tecla:plan', fallback: { plan: null } })

export const usePlan = () => useStore(store).plan
export const getPlan = () => store.get().plan
export const savePlan = (plan: StudyPlan | null) => store.set({ plan })

// --- El plan, semana a semana ---------------------------------------------------------------------

/** Minutos que se calculan para una lección (explicación y ejercicios) y para un examen. */
export const LESSON_MINUTES = 25
export const EXAM_MINUTES = 45

export interface PlanItem {
  level: CourseLevelId
  kind: 'lesson' | 'exam'
  /** Id de la lección (en un examen, `examen`). */
  id: string
  title: string
  minutes: number
}

/** Lo mínimo de cada nivel del curso que necesita el plan. */
export interface PlanLevel {
  id: CourseLevelId
  lessons: ReadonlyArray<{ id: string; title: string }>
}

/** Niveles del curso que recorre el plan, en orden. */
export const planLevels = (plan: Pick<StudyPlan, 'from' | 'to'>): CourseLevelId[] =>
  COURSE_LEVELS.slice(levelIndex(plan.from), levelIndex(plan.to) + 1).map((level) => level.id)

/** Lecciones y exámenes del plan, en el orden en que se hacen. */
export function planItems(plan: Pick<StudyPlan, 'from' | 'to'>, levels: readonly PlanLevel[]): PlanItem[] {
  return planLevels(plan).flatMap((id) => {
    const level = levels.find((entry) => entry.id === id)
    if (!level) return []
    const items: PlanItem[] = level.lessons.map((lesson) => ({
      level: id,
      kind: 'lesson',
      id: lesson.id,
      title: lesson.title,
      minutes: LESSON_MINUTES,
    }))
    items.push({
      level: id,
      kind: 'exam',
      id: 'examen',
      title: `Examen ${COURSE_LEVELS[levelIndex(id)].name}`,
      minutes: EXAM_MINUTES,
    })
    return items
  })
}

/** Minutos por semana para el curso. */
export const courseMinutesPerWeek = (plan: StudyPlan) => plan.minutes * plan.days * PROGRAMS[plan.program].shares.course

/**
 * Holgura al llenar una semana: si una lección más se pasa por poco (dos de 25 min en 48), cabe.
 * Los minutos por lección son una estimación; dejar fuera una por dos minutos alargaría el plan.
 */
const WEEK_SLACK = 1.1

/**
 * Reparte las lecciones en semanas según el tiempo del curso: cada semana se llena hasta su
 * capacidad, con un margen (al menos una lección por semana, aunque el tiempo sea poco).
 */
export function planWeeks(plan: StudyPlan, items: readonly PlanItem[]): PlanItem[][] {
  const capacity = courseMinutesPerWeek(plan) * WEEK_SLACK
  const weeks: PlanItem[][] = []
  let week: PlanItem[] = []
  let used = 0
  for (const item of items) {
    if (week.length > 0 && used + item.minutes > capacity) {
      weeks.push(week)
      week = []
      used = 0
    }
    week.push(item)
    used += item.minutes
  }
  if (week.length > 0) weeks.push(week)
  return weeks
}

const DAY_MS = 86_400_000
/** Días enteros entre dos instantes, contados en fechas locales (cambios de hora incluidos). */
function daysBetween(from: number, to: number): number {
  const start = new Date(from)
  const end = new Date(to)
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((b - a) / DAY_MS)
}

/** Día del plan (0 el primero). */
export const planDay = (plan: StudyPlan, now = Date.now()) => Math.max(0, daysBetween(plan.startedAt, now))
/** Semana del plan (1 la primera). */
export const planWeek = (plan: StudyPlan, now = Date.now()) => Math.floor(planDay(plan, now) / 7) + 1

export type Pace = 'ahead' | 'on-track' | 'behind'

/**
 * ¿Cómo va el plan? Adelantado si ya superó lo de esta semana y algo más; atrasado solo si le
 * falta algo de antes de la semana pasada (una semana de margen: la vida pasa).
 */
export function planPace(weeks: readonly PlanItem[][], done: number, week: number): Pace {
  const through = (count: number) => weeks.slice(0, Math.max(0, count)).reduce((sum, items) => sum + items.length, 0)
  const total = through(weeks.length)
  if (done > through(week) || (done === total && total > 0 && week <= weeks.length)) return 'ahead'
  if (done >= through(week - 2)) return 'on-track'
  return 'behind'
}

// --- Ajustes que propone el plan -----------------------------------------------------------------

/** Respuestas por minuto de vocabulario (una respuesta, con su audio y su repaso, lleva ~10 s). */
const ANSWERS_PER_MINUTE = 6

/** Meta diaria de respuestas para el tiempo de vocabulario del plan: la opción más cercana. */
export function planDailyGoal(plan: Pick<StudyPlan, 'program' | 'minutes'>): DailyGoal {
  const target = plan.minutes * PROGRAMS[plan.program].shares.vocabulary * ANSWERS_PER_MINUTE
  return DAILY_GOALS.reduce((best, option) => (Math.abs(option - target) < Math.abs(best - target) ? option : best))
}

/** Palabras nuevas por día que encajan con esa meta (las nuevas son lo que más cuesta). */
export function planNewPerDay(goal: DailyGoal): NewPerDay {
  if (goal <= 20) return 10
  if (goal <= 40) return 20
  return 40
}

// --- Las tareas de hoy ----------------------------------------------------------------------------

export type TaskKind = 'vocabulary' | 'course' | 'listening' | 'speaking'

/** Qué toca hoy, en orden: el vocabulario siempre; el resto, según el tiempo y en rotación. */
export function todayKinds(plan: StudyPlan, now = Date.now(), courseLeft = true): TaskKind[] {
  const shares = PROGRAMS[plan.program].shares
  const others = (['course', 'listening', 'speaking'] as const)
    .filter((kind) => kind !== 'course' || courseLeft)
    .toSorted((a, b) => shares[b] - shares[a])
  const extras = plan.minutes <= 10 ? 1 : plan.minutes <= 20 ? 2 : 3
  const day = planDay(plan, now)
  if (extras >= others.length) return ['vocabulary', ...others]
  if (extras === 1) {
    // Un día lo principal y otro una de las demás, por turnos.
    const pick = day % 2 === 0 ? others[0] : others[1 + (Math.floor(day / 2) % (others.length - 1))]
    return ['vocabulary', pick]
  }
  return ['vocabulary', others[0], others[1 + (day % (others.length - 1))]]
}

/** La colección del día para los programas que insisten en un vocabulario (en días alternos). */
export function topicOfDay(plan: StudyPlan, now = Date.now()): TopicId | null {
  const { topics } = PROGRAMS[plan.program]
  const day = planDay(plan, now)
  if (topics.length === 0 || day % 2 === 0) return null
  return topics[Math.floor(day / 2) % topics.length]
}

/** Nivel en que va el plan: el de lo siguiente sin superar, o el último si ya se terminó. */
export function currentPlanLevel(plan: StudyPlan, next: PlanItem | null): CourseLevelId {
  return next?.level ?? plan.to
}

/** Texto que recomendar: del nivel en curso, sin hacer, de los temas del programa primero. */
export function recommendText<T extends { id: string; level: CourseLevelId; topic: string }>(
  texts: readonly T[],
  level: CourseLevelId,
  done: (id: string) => boolean,
  topics: readonly string[] = [],
): T | null {
  const rank = levelIndex(level)
  const pending = texts.filter((text) => !done(text.id))
  const atLevel = pending.filter((text) => text.level === level)
  const byTopic = (list: readonly T[]) => list.find((text) => topics.includes(text.topic)) ?? list[0] ?? null
  return (
    byTopic(atLevel) ??
    byTopic(pending.filter((text) => levelIndex(text.level) < rank).toReversed()) ??
    byTopic(pending.filter((text) => levelIndex(text.level) > rank)) ??
    texts.find((text) => text.level === level) ??
    null
  )
}

/** Días de esta semana del plan con práctica, hasta hoy (para «3 de 5 días»). */
export function studyDaysThisWeek(plan: StudyPlan, practiceDays: readonly string[], now = Date.now()): number {
  const days = new Set(practiceDays)
  const today = planDay(plan, now)
  const first = (planWeek(plan, now) - 1) * 7
  const start = new Date(plan.startedAt)
  let count = 0
  for (let day = first; day <= today; day++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day, 12)
    if (days.has(dayKey(date.getTime()))) count++
  }
  return count
}

/**
 * Nivel por el que va el usuario: el primero sin examen aprobado (dentro del plan, si tiene uno).
 * Con él se recomiendan los textos.
 */
export function levelInProgress(examPassed: (level: CourseLevelId) => boolean, plan: StudyPlan | null): CourseLevelId {
  const levels = plan ? planLevels(plan) : COURSE_LEVELS.map((level) => level.id)
  return levels.find((level) => !examPassed(level)) ?? levels.at(-1) ?? 'a1'
}
