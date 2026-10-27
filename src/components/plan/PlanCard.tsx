import { cn } from '@/lib/cn'
import { courseLevelInfo } from '@/lib/courseMeta'
import { PROGRAM_IDS, PROGRAMS, type StudyPlan, usePlan } from '@/lib/studyPlan'
import { ArrowRightIcon } from '../icons'
import { RouteIcon } from '../mediaIcons'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Surface } from '../ui/Surface'
import { PACE, type PlanHandlers, PlanTasks } from './PlanTasks'
import { usePlanOverview } from './usePlanOverview'

/**
 * «Tu plan» en el inicio: sin plan, la invitación a crear uno; con plan, en qué semana va, cómo va
 * y las tareas de hoy. Se carga aparte (no hace falta para el primer pintado).
 */
export function PlanCard({ now, onOpenPlan, ...handlers }: { now: number; onOpenPlan: () => void } & PlanHandlers) {
  const plan = usePlan()
  return plan ? (
    <ActivePlan plan={plan} now={now} onOpenPlan={onOpenPlan} handlers={handlers} />
  ) : (
    <PlanInvite onOpenPlan={onOpenPlan} />
  )
}

function PlanInvite({ onOpenPlan }: { onOpenPlan: () => void }) {
  return (
    <Surface as="section" aria-labelledby="plan-invitacion" className="relative overflow-hidden p-6 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -left-16 size-72 rounded-full bg-accent-soft blur-3xl"
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-accent-ink shadow-glow">
            <RouteIcon width={22} height={22} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">Plan de estudio</p>
            <h2 id="plan-invitacion" className="mt-1 text-xl font-semibold">
              Tu plan personalizado, semana a semana
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              Elige tu objetivo, tu nivel y cuánto tiempo tienes: cada día sabrás qué toca, del curso, el vocabulario,
              la escucha y la pronunciación.
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {PROGRAM_IDS.map((id) => (
                <li key={id}>
                  <Badge tone="accent-soft">{PROGRAMS[id].name}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Button variant="primary" size="lg" onClick={onOpenPlan} className="self-start lg:self-center">
          Crear mi plan
          <ArrowRightIcon width={18} height={18} />
        </Button>
      </div>
    </Surface>
  )
}

function ActivePlan({
  plan,
  now,
  onOpenPlan,
  handlers,
}: {
  plan: StudyPlan
  now: number
  onOpenPlan: () => void
  handlers: PlanHandlers
}) {
  const overview = usePlanOverview(plan, now)
  const program = PROGRAMS[plan.program]
  const ratio = overview.items.length === 0 ? 0 : overview.done / overview.items.length
  const pending = overview.tasks.filter((task) => !task.done).length
  const pace = PACE[overview.pace]
  return (
    <Surface
      as="section"
      aria-labelledby="plan-hoy"
      className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
    >
      <div className="flex min-w-0 flex-col">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">
          <RouteIcon width={14} height={14} className="text-accent" />
          Tu plan
        </p>
        <h2 id="plan-hoy" className="mt-2 text-xl font-semibold">
          {program.name}
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          De {courseLevelInfo(plan.from).name} a {courseLevelInfo(plan.to).name} · {plan.minutes} min, {plan.days} días
          por semana
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="accent">
            Semana {Math.min(overview.week, overview.weeks.length)} de {overview.weeks.length}
          </Badge>
          <Badge tone={pace.tone}>{pace.label}</Badge>
        </div>
        <div className="mt-5">
          <div
            className="h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Avance del plan"
            aria-valuemin={0}
            aria-valuemax={overview.items.length}
            aria-valuenow={overview.done}
          >
            <div className="h-full rounded-full bg-brand" style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted tabular-nums">
            {overview.done} de {overview.items.length} lecciones y exámenes · {overview.studyDays} de {plan.days} días
            esta semana
          </p>
        </div>
        <Button onClick={onOpenPlan} className="mt-5 self-start lg:mt-auto">
          Ver mi plan
        </Button>
      </div>
      <div className="min-w-0">
        <p className={cn('text-sm font-semibold', pending === 0 ? 'text-ok' : 'text-ink')}>
          {pending === 0
            ? '¡Hoy ya cumpliste tu plan!'
            : `Hoy toca · ${pending} de ${overview.tasks.length} pendientes`}
        </p>
        <div className="mt-1">
          <PlanTasks tasks={overview.tasks} handlers={handlers} />
        </div>
      </div>
    </Surface>
  )
}
