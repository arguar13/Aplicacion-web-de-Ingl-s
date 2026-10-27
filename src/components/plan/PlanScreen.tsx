/**
 * El plan de estudio: el asistente para crearlo (objetivo, niveles, tiempo y resumen) y, con un
 * plan en marcha, su panel: semana, avance, las tareas de hoy, esta semana y el camino completo.
 */
import courseIndex from 'virtual:course-index'
import { useId, useState } from 'react'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'
import { COURSE_LEVELS, type CourseLevelId, courseLevelInfo } from '@/lib/courseMeta'
import { useCourseProgress } from '@/lib/courseProgress'
import { plural } from '@/lib/format'
import { updateSettings, useSettings } from '@/lib/settings'
import {
  PLAN_DAYS,
  PLAN_MINUTES,
  planDailyGoal,
  type PlanDays,
  planItems,
  type PlanMinutes,
  planNewPerDay,
  planWeeks,
  PROGRAM_IDS,
  type ProgramId,
  PROGRAMS,
  savePlan,
  type StudyPlan,
  usePlan,
} from '@/lib/studyPlan'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon } from '../icons'
import { RouteIcon } from '../mediaIcons'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { PageShell } from '../ui/PageShell'
import { Surface } from '../ui/Surface'
import { PACE, type PlanHandlers, PlanTasks, runTask } from './PlanTasks'
import { itemPassed, usePlanOverview } from './usePlanOverview'

const LEVELS = COURSE_LEVELS.map((level) => ({ id: level.id, lessons: courseIndex[level.id] }))
const longDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })
const levelIndex = (id: CourseLevelId) => COURSE_LEVELS.findIndex((level) => level.id === id)
/** Semanas del camino que se ven de entrada; el resto, a un toque. */
const WEEKS_SHOWN = 6

export function PlanScreen({ onExit, ...handlers }: { onExit: () => void } & PlanHandlers) {
  const plan = usePlan()
  const [editing, setEditing] = useState(false)
  return (
    <PageShell back={{ label: 'Inicio', onClick: onExit }} wide>
      {plan && !editing ? (
        <PlanDashboard plan={plan} handlers={handlers} onEdit={() => setEditing(true)} />
      ) : (
        <PlanWizard initial={plan} onDone={() => setEditing(false)} onCancel={plan ? () => setEditing(false) : null} />
      )}
    </PageShell>
  )
}

// --- Asistente ------------------------------------------------------------------------------------

type Draft = Omit<StudyPlan, 'startedAt'>
const STEPS = ['Objetivo', 'Niveles', 'Tiempo', 'Tu plan'] as const

function PlanWizard({
  initial,
  onDone,
  onCancel,
}: {
  initial: StudyPlan | null
  onDone: () => void
  onCancel: (() => void) | null
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(
    initial ?? { program: 'complete', from: 'a1', to: 'c1', minutes: 20, days: 5 },
  )
  const settings = useSettings()

  function chooseProgram(program: ProgramId) {
    const { from, to } = PROGRAMS[program]
    setDraft({ ...draft, program, from, to })
    setStep(1)
  }

  function start() {
    const goal = planDailyGoal(draft)
    savePlan({ ...draft, startedAt: Date.now() })
    updateSettings({ dailyGoal: goal, newPerDay: planNewPerDay(goal) })
    onDone()
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Plan de estudio</p>
          <h1 className="mt-2 font-display text-5xl leading-none">{initial ? 'Cambia tu plan' : 'Crea tu plan'}</h1>
        </div>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>

      <ol aria-label="Pasos" className="mt-7 grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i >= step}
              aria-current={i === step ? 'step' : undefined}
              className="w-full cursor-pointer text-left disabled:cursor-default"
            >
              <span className={cn('block h-1.5 rounded-full', i <= step ? 'bg-brand' : 'bg-line')} />
              <span
                className={cn(
                  'mt-2 block text-xs font-semibold max-sm:sr-only',
                  i === step ? 'text-ink' : 'text-muted',
                )}
              >
                {i + 1}. {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section aria-labelledby="paso-objetivo" className="mt-8">
          <h2 id="paso-objetivo" className="text-xl font-semibold">
            ¿Para qué quieres el inglés?
          </h2>
          <p className="mt-1 text-sm text-muted">El programa decide en qué se reparte tu tiempo cada día.</p>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAM_IDS.map((id) => {
              const program = PROGRAMS[id]
              const selected = draft.program === id
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => chooseProgram(id)}
                    aria-pressed={selected}
                    className={cn(
                      'group flex h-full w-full cursor-pointer flex-col rounded-3xl border bg-surface p-5 text-left shadow-card',
                      'transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-key-hover',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                      selected ? 'border-accent/50' : 'border-line',
                    )}
                  >
                    <span className="text-[17px] font-semibold">{program.name}</span>
                    <span className="mt-1 text-sm leading-snug text-muted">{program.tagline}</span>
                    <span className="mt-4 flex flex-wrap gap-1.5 pt-1">
                      {program.highlights.map((highlight) => (
                        <Badge key={highlight} tone="accent-soft">
                          {highlight}
                        </Badge>
                      ))}
                    </span>
                    <ShareBar program={id} className="mt-auto pt-5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="paso-niveles" className="mt-8">
          <h2 id="paso-niveles" className="text-xl font-semibold">
            ¿Desde dónde y hasta dónde?
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {PROGRAMS[draft.program].description} Si no sabes tu nivel, empieza por el que te proponemos: las lecciones
            que ya domines las superarás rápido.
          </p>
          <LevelPicker
            label="Empiezo en"
            value={draft.from}
            onChange={(from) =>
              setDraft({ ...draft, from, to: levelIndex(draft.to) < levelIndex(from) ? from : draft.to })
            }
          />
          <LevelPicker
            label="Quiero llegar a"
            value={draft.to}
            min={draft.from}
            onChange={(to) => setDraft({ ...draft, to })}
          />
          <WizardNav onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="paso-tiempo" className="mt-8">
          <h2 id="paso-tiempo" className="text-xl font-semibold">
            ¿Cuánto tiempo puedes dedicarle?
          </h2>
          <p className="mt-1 text-sm text-muted">Mejor poco y constante que mucho de vez en cuando.</p>
          <OptionRow
            label="Minutos al día"
            options={PLAN_MINUTES}
            value={draft.minutes}
            format={(value) => `${value} min`}
            onChange={(minutes: PlanMinutes) => setDraft({ ...draft, minutes })}
          />
          <OptionRow
            label="Días por semana"
            options={PLAN_DAYS}
            value={draft.days}
            format={(value) => (value === 7 ? 'Todos' : String(value))}
            onChange={(days: PlanDays) => setDraft({ ...draft, days })}
          />
          <WizardNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </section>
      )}

      {step === 3 && (
        <PlanPreview draft={draft} currentGoal={settings.dailyGoal} onBack={() => setStep(2)} onStart={start} />
      )}
    </div>
  )
}

/** En qué se reparte el tiempo de un programa, como una barra de cuatro colores. */
function ShareBar({ program, className }: { program: ProgramId; className?: string }) {
  const { shares } = PROGRAMS[program]
  const parts = [
    { key: 'course', label: 'Curso', value: shares.course, tone: 'bg-gold' },
    { key: 'vocabulary', label: 'Vocabulario', value: shares.vocabulary, tone: 'bg-accent' },
    { key: 'listening', label: 'Escucha', value: shares.listening, tone: 'bg-ok' },
    { key: 'speaking', label: 'Habla', value: shares.speaking, tone: 'bg-bad' },
  ]
  return (
    <span className={cn('block w-full', className)}>
      <span className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {parts.map((part) => (
          <span key={part.key} className={part.tone} style={{ width: `${part.value * 100}%` }} />
        ))}
      </span>
      <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted tabular-nums">
        {parts.map((part) => (
          <span key={part.key} className="inline-flex items-center gap-1">
            <span aria-hidden className={cn('size-1.5 rounded-full', part.tone)} />
            {part.label} {Math.round(part.value * 100)} %
          </span>
        ))}
      </span>
    </span>
  )
}

function LevelPicker({
  label,
  value,
  min = 'a1',
  onChange,
}: {
  label: string
  value: CourseLevelId
  min?: CourseLevelId
  onChange: (level: CourseLevelId) => void
}) {
  const id = useId()
  return (
    <div className="mt-6">
      <p id={id} className="text-sm font-semibold">
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {COURSE_LEVELS.map((level) => {
          const disabled = levelIndex(level.id) < levelIndex(min)
          return (
            <button
              key={level.id}
              type="button"
              disabled={disabled}
              aria-pressed={value === level.id}
              onClick={() => onChange(level.id)}
              className={cn(
                'flex cursor-pointer flex-col rounded-2xl border px-3 py-3 text-left transition-colors disabled:cursor-default disabled:opacity-40',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                value === level.id
                  ? 'border-accent/50 bg-accent-soft'
                  : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <span className={cn('font-display text-2xl leading-none', value === level.id && 'text-accent')}>
                {level.name}
              </span>
              <span className="mt-1 text-xs text-muted">{level.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OptionRow<T extends number>({
  label,
  options,
  value,
  format,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  format: (value: T) => string
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <div className="mt-6">
      <p id={id} className="text-sm font-semibold">
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              'h-11 min-w-16 cursor-pointer rounded-full border px-5 text-sm font-semibold tabular-nums transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              value === option
                ? 'border-transparent bg-brand text-accent-ink shadow-glow'
                : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

function WizardNav({ onBack, onNext, next = 'Siguiente' }: { onBack: () => void; onNext: () => void; next?: string }) {
  return (
    <div className="mt-8 flex justify-between gap-3">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon width={16} height={16} />
        Atrás
      </Button>
      <Button variant="primary" size="lg" onClick={onNext}>
        {next}
        <ArrowRightIcon width={18} height={18} />
      </Button>
    </div>
  )
}

function PlanPreview({
  draft,
  currentGoal,
  onBack,
  onStart,
}: {
  draft: Draft
  currentGoal: number
  onBack: () => void
  onStart: () => void
}) {
  const now = useNow()
  const plan: StudyPlan = { ...draft, startedAt: now }
  const items = planItems(plan, LEVELS)
  const weeks = planWeeks(plan, items)
  const goal = planDailyGoal(draft)
  const program = PROGRAMS[draft.program]
  const lessons = items.filter((item) => item.kind === 'lesson').length
  const exams = items.length - lessons
  const ends = plan.startedAt + weeks.length * 7 * 86_400_000
  return (
    <section aria-labelledby="paso-resumen" className="mt-8">
      <h2 id="paso-resumen" className="text-xl font-semibold">
        Tu plan: {program.name}
      </h2>
      <Surface className="mt-5 grid gap-px overflow-hidden bg-line p-0 sm:grid-cols-3">
        {[
          { value: `${courseLevelInfo(draft.from).name} → ${courseLevelInfo(draft.to).name}`, label: 'niveles' },
          { value: plural(weeks.length, 'semana'), label: `hasta el ${longDate.format(ends)}` },
          { value: `${draft.minutes} min`, label: `${draft.days} días por semana` },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface px-5 py-5">
            <p className="font-display text-3xl leading-none">{stat.value}</p>
            <p className="mt-1.5 text-sm text-muted">{stat.label}</p>
          </div>
        ))}
      </Surface>
      <ul className="mt-5 space-y-2.5 text-[15px] leading-relaxed">
        <li>
          <strong className="font-semibold">Curso:</strong> {plural(lessons, 'lección', 'lecciones')} y{' '}
          {plural(exams, 'examen', 'exámenes')}, unas {Math.round(items.length / weeks.length)} por semana.
        </li>
        <li>
          <strong className="font-semibold">Vocabulario:</strong> una meta de {goal} respuestas al día
          {goal === currentGoal ? ' (la que ya tienes)' : ` (ahora tienes ${currentGoal}; la ajustamos)`}, con{' '}
          {planNewPerDay(goal)} palabras nuevas como mucho.
        </li>
        <li>
          <strong className="font-semibold">Oído y pronunciación:</strong> textos de tu nivel para escuchar y leer en
          voz alta,{' '}
          {program.shares.listening + program.shares.speaking >= 0.4
            ? 'casi todos los días'
            : 'varias veces por semana'}
          .
        </li>
      </ul>
      <ShareBar program={draft.program} className="mt-5 max-w-md" />
      <WizardNav onBack={onBack} onNext={onStart} next="Empezar mi plan" />
    </section>
  )
}

// --- Panel del plan en marcha --------------------------------------------------------------------

function PlanDashboard({ plan, handlers, onEdit }: { plan: StudyPlan; handlers: PlanHandlers; onEdit: () => void }) {
  const now = useNow()
  const overview = usePlanOverview(plan, now)
  const course = useCourseProgress()
  const [allWeeks, setAllWeeks] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const program = PROGRAMS[plan.program]
  const pace = PACE[overview.pace]
  const currentWeek = Math.min(overview.week, overview.weeks.length)
  const thisWeek = overview.weeks[currentWeek - 1] ?? []
  const finished = overview.next === null
  const shownWeeks = allWeeks
    ? overview.weeks
    : overview.weeks.slice(Math.max(0, currentWeek - 2), Math.max(0, currentWeek - 2) + WEEKS_SHOWN)
  const firstShown = allWeeks ? 0 : Math.max(0, currentWeek - 2)

  return (
    <>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
            <RouteIcon width={14} height={14} />
            Tu plan de estudio
          </p>
          <h1 className="mt-2 font-display text-5xl leading-none">{program.name}</h1>
          <p className="mt-3 text-[15px] text-muted">{program.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onEdit}>Cambiar el plan</Button>
          {confirmLeave ? (
            <Button variant="danger" onClick={() => savePlan(null)}>
              Sí, dejar el plan
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmLeave(true)}>
              Dejar el plan
            </Button>
          )}
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line shadow-card lg:grid-cols-4">
        {[
          { label: 'Semana', value: `${currentWeek} de ${overview.weeks.length}` },
          { label: 'Avance', value: `${overview.done} de ${overview.items.length}` },
          { label: 'Días esta semana', value: `${overview.studyDays} de ${plan.days}` },
          { label: 'Terminas', value: longDate.format(overview.endsAt) },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface px-5 py-5">
            <dt className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">{stat.label}</dt>
            <dd className="mt-1.5 text-xl font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Surface as="section" aria-labelledby="plan-hoy" className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="plan-hoy" className="text-lg font-semibold">
              Hoy
            </h2>
            <Badge tone={finished ? 'ok-soft' : pace.tone}>{finished ? 'Curso del plan terminado' : pace.label}</Badge>
          </div>
          <div className="mt-2">
            <PlanTasks tasks={overview.tasks} handlers={handlers} />
          </div>
        </Surface>

        <Surface as="section" aria-labelledby="plan-semana" className="p-6">
          <h2 id="plan-semana" className="text-lg font-semibold">
            Esta semana
          </h2>
          {thisWeek.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nada del curso esta semana: repasa y practica a tu ritmo.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {thisWeek.map((item) => {
                const done = itemPassed(course, item)
                return (
                  <li key={`${item.level}/${item.id}`}>
                    <button
                      type="button"
                      onClick={() => runTask({ type: 'lesson', item }, handlers)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-bg px-3.5 py-3 text-left transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <Badge tone={done ? 'ok-soft' : 'accent-soft'}>{courseLevelInfo(item.level).name}</Badge>
                      <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', done && 'text-muted')}>
                        {item.title}
                      </span>
                      {done ? (
                        <CheckCircleIcon width={18} height={18} className="shrink-0 text-ok" />
                      ) : (
                        <ArrowRightIcon width={16} height={16} className="shrink-0 text-muted" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Surface>
      </div>

      <section aria-labelledby="plan-camino" className="mt-10">
        <h2 id="plan-camino" className="font-display text-3xl">
          Tu camino
        </h2>
        <p className="mt-1 text-sm text-muted">
          Las lecciones y exámenes de {courseLevelInfo(plan.from).name} a {courseLevelInfo(plan.to).name}, repartidos
          según tu tiempo. Puedes adelantarte cuando quieras.
        </p>
        <ol className="mt-6 space-y-3">
          {shownWeeks.map((items, i) => {
            const number = firstShown + i + 1
            const done = items.every((item) => itemPassed(course, item))
            const current = number === currentWeek
            return (
              <li key={number}>
                <Surface
                  className={cn(
                    'flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-5',
                    current && 'border-accent/45',
                  )}
                >
                  <div className="flex w-32 shrink-0 items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
                    <span className="text-sm font-semibold">Semana {number}</span>
                    {current && <Badge tone="accent">Ahora</Badge>}
                    {done && !current && <Badge tone="ok-soft">Hecha</Badge>}
                  </div>
                  <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {items.map((item) => (
                      <li key={`${item.level}/${item.id}`}>
                        <span
                          className={cn(
                            'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                            itemPassed(course, item)
                              ? 'border-ok/30 bg-ok-soft text-ok'
                              : item.kind === 'exam'
                                ? 'border-gold/40 bg-gold-soft text-ink'
                                : 'border-line bg-bg text-ink/80',
                          )}
                        >
                          <span className="font-semibold">{courseLevelInfo(item.level).name}</span>
                          <span className="truncate">{item.title}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Surface>
              </li>
            )
          })}
        </ol>
        {!allWeeks && overview.weeks.length > shownWeeks.length && (
          <div className="mt-5 flex justify-center">
            <Button onClick={() => setAllWeeks(true)}>Ver las {overview.weeks.length} semanas</Button>
          </div>
        )}
      </section>
    </>
  )
}
