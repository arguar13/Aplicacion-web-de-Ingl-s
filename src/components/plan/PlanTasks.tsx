import { cn } from '@/lib/cn'
import type { CourseLevelId } from '@/lib/courseMeta'
import type { TextMode } from '@/lib/routes'
import type { Pace, TaskKind } from '@/lib/studyPlan'
import type { TopicId } from '@/lib/topicMeta'
import { ArrowRightIcon, CheckCircleIcon, GraduationIcon, HeadphonesIcon, MicIcon, SparkIcon } from '../icons'
import { CircleIcon } from '../mediaIcons'
import type { PlanTask, TaskAction } from './usePlanOverview'

/** Adónde llevan las tareas del plan. */
export interface PlanHandlers {
  onStartCoach: () => void
  onOpenTopic: (topic: TopicId) => void
  onOpenLesson: (level: CourseLevelId, lesson: string) => void
  onOpenExam: (level: CourseLevelId) => void
  onOpenText: (mode: TextMode, id: string) => void
}

export function runTask(action: TaskAction, handlers: PlanHandlers) {
  switch (action.type) {
    case 'coach':
      return handlers.onStartCoach()
    case 'topic':
      return handlers.onOpenTopic(action.topic)
    case 'lesson':
      return action.item.kind === 'exam'
        ? handlers.onOpenExam(action.item.level)
        : handlers.onOpenLesson(action.item.level, action.item.id)
    case 'text':
      return handlers.onOpenText(action.mode, action.text.id)
  }
}

const KIND: Record<TaskKind, { label: string; Icon: typeof SparkIcon; tone: string }> = {
  vocabulary: { label: 'Vocabulario', Icon: SparkIcon, tone: 'bg-accent-soft text-accent' },
  course: { label: 'Curso', Icon: GraduationIcon, tone: 'bg-gold-soft text-gold' },
  listening: { label: 'Escucha', Icon: HeadphonesIcon, tone: 'bg-ok-soft text-ok' },
  speaking: { label: 'Habla', Icon: MicIcon, tone: 'bg-bad-soft text-bad' },
}

export const PACE: Record<Pace, { label: string; tone: 'ok-soft' | 'accent-soft' | 'bad-soft' }> = {
  ahead: { label: 'Vas adelantado', tone: 'ok-soft' },
  'on-track': { label: 'Vas al día', tone: 'accent-soft' },
  behind: { label: 'Vas atrasado', tone: 'bad-soft' },
}

/** Las tareas de hoy: cada una se abre al tocarla y se marca sola al hacerla. */
export function PlanTasks({ tasks, handlers }: { tasks: readonly PlanTask[]; handlers: PlanHandlers }) {
  return (
    <ul className="divide-y divide-line">
      {tasks.map((task) => {
        const { Icon, tone, label } = KIND[task.kind]
        const { action } = task
        return (
          <li key={task.kind}>
            <button
              type="button"
              disabled={!action}
              onClick={() => action && runTask(action, handlers)}
              className={cn(
                'group flex w-full cursor-pointer items-center gap-3.5 py-3 text-left disabled:cursor-default',
                'focus-visible:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              )}
            >
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-2xl', tone)}>
                <Icon width={18} height={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">{label}</span>
                <span
                  className={cn('block truncate text-[15px] font-semibold', task.done && 'text-muted line-through')}
                >
                  {task.title}
                </span>
                {task.detail && <span className="block truncate text-xs text-muted">{task.detail}</span>}
              </span>
              {task.done ? (
                <span className="shrink-0 text-ok">
                  <CheckCircleIcon width={22} height={22} />
                  <span className="sr-only">Hecha</span>
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-muted">
                  <CircleIcon width={22} height={22} />
                  <span className="sr-only">Pendiente</span>
                  {action && (
                    <ArrowRightIcon
                      width={16}
                      height={16}
                      className="-ml-1 opacity-0 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:opacity-100"
                    />
                  )}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
