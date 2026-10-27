/**
 * El plan de estudio visto hoy: semanas, avance, ritmo y las tareas del día, calculado a partir de
 * lo que ya se guarda (curso, textos y práctica del día). Lo usan la tarjeta del inicio y la
 * pantalla del plan, así las dos dicen siempre lo mismo.
 */
import courseIndex from 'virtual:course-index'
import { COURSE_LEVELS, courseLevelInfo } from '@/lib/courseMeta'
import { type CourseProgress, examPassed, lessonPassed, useCourseProgress } from '@/lib/courseProgress'
import { dayKey, todayStats, useProgress } from '@/lib/progress'
import { useSettings } from '@/lib/settings'
import {
  type Pace,
  type PlanItem,
  planItems,
  planPace,
  planWeek,
  planWeeks,
  PROGRAMS,
  recommendText,
  type StudyPlan,
  studyDaysThisWeek,
  type TaskKind,
  todayKinds,
  topicOfDay,
} from '@/lib/studyPlan'
import { spokenPassed, textsToday, useTextProgress } from '@/lib/textProgress'
import { listeningMinutes, type StudyText, useTexts } from '@/lib/texts'
import { type TopicId, topicInfo } from '@/lib/topicMeta'

const LEVELS = COURSE_LEVELS.map((level) => ({ id: level.id, lessons: courseIndex[level.id] }))

export const itemPassed = (course: CourseProgress, item: PlanItem) =>
  item.kind === 'lesson' ? lessonPassed(course, item.level, item.id) : examPassed(course, item.level)

/** ¿Se hizo hoy alguna lección, examen o quiz del curso? */
function courseToday(course: CourseProgress, now: number): boolean {
  const today = dayKey(now)
  const attempts = [...Object.values(course.lessons), ...Object.values(course.exams), ...Object.values(course.quizzes)]
  return attempts.some((attempt) => attempt !== undefined && dayKey(attempt.at) === today)
}

/** Qué hace cada tarea al tocarla. */
export type TaskAction =
  | { type: 'coach' }
  | { type: 'topic'; topic: TopicId }
  | { type: 'lesson'; item: PlanItem }
  | { type: 'text'; mode: 'listen' | 'read'; text: StudyText }

export interface PlanTask {
  kind: TaskKind
  title: string
  detail: string
  done: boolean
  action: TaskAction | null
}

export interface PlanOverview {
  items: PlanItem[]
  weeks: PlanItem[][]
  done: number
  next: PlanItem | null
  week: number
  pace: Pace
  /** Días con práctica esta semana del plan, de los que se propuso. */
  studyDays: number
  tasks: PlanTask[]
  /** Cuándo termina el plan si se sigue el ritmo previsto. */
  endsAt: number
}

const WEEK_MS = 7 * 86_400_000

export function usePlanOverview(plan: StudyPlan, now: number): PlanOverview {
  const course = useCourseProgress()
  const progress = useProgress()
  const texts = useTextProgress()
  const library = useTexts()
  const { dailyGoal } = useSettings()
  const program = PROGRAMS[plan.program]

  const items = planItems(plan, LEVELS)
  const weeks = planWeeks(plan, items)
  const done = items.filter((item) => itemPassed(course, item)).length
  const next = items.find((item) => !itemPassed(course, item)) ?? null
  const week = planWeek(plan, now)
  const level = next?.level ?? plan.to
  const today = textsToday(texts, now)
  const answers = todayStats(progress, now).answers
  const list = library.status === 'ready' ? library.texts : []
  const toListen = recommendText(list, level, (id) => id in texts.listened, program.textTopics)
  const toRead = recommendText(list, level, (id) => spokenPassed(texts, id), program.textTopics)

  const tasks = todayKinds(plan, now, next !== null).map((kind): PlanTask => {
    switch (kind) {
      case 'vocabulary': {
        const topic = topicOfDay(plan, now)
        return {
          kind,
          title: topic ? `Vocabulario: ${topicInfo(topic).name.toLowerCase()}` : 'Vocabulario: sesión inteligente',
          detail: `${Math.min(answers, dailyGoal)} de ${dailyGoal} respuestas`,
          done: answers >= dailyGoal,
          action: topic ? { type: 'topic', topic } : { type: 'coach' },
        }
      }
      case 'course':
        return {
          kind,
          title: next ? (next.kind === 'exam' ? next.title : `Lección: ${next.title}`) : 'Curso terminado',
          detail: next ? `Curso ${courseLevelInfo(next.level).name} · unos ${next.minutes} min` : '',
          done: courseToday(course, now),
          action: next ? { type: 'lesson', item: next } : null,
        }
      case 'listening':
        return {
          kind,
          title: toListen ? `Escucha: ${toListen.title}` : 'Escucha un texto',
          detail: toListen ? `${toListen.titleEs} · ${listeningMinutes(toListen)} min` : 'Entrena el oído',
          done: today.listened,
          action: toListen ? { type: 'text', mode: 'listen', text: toListen } : null,
        }
      case 'speaking':
        return {
          kind,
          title: toRead ? `Lee en voz alta: ${toRead.title}` : 'Lee un texto en voz alta',
          detail: toRead ? `${toRead.titleEs} · con tu voz` : 'Entrena la pronunciación',
          done: today.spoken,
          action: toRead ? { type: 'text', mode: 'read', text: toRead } : null,
        }
    }
  })

  return {
    items,
    weeks,
    done,
    next,
    week,
    pace: planPace(weeks, done, week),
    studyDays: studyDaysThisWeek(plan, progress.days, now),
    tasks,
    endsAt: plan.startedAt + weeks.length * WEEK_MS,
  }
}
