import { assessLearner, coachOverview, type Pace } from '@/lib/coach'
import { cn } from '@/lib/cn'
import { useEvents } from '@/lib/events'
import { plural } from '@/lib/format'
import { todayStats, useProgress } from '@/lib/progress'
import { useSettings } from '@/lib/settings'
import { endOfDay } from '@/lib/smartDecks'
import { ArrowRightIcon, SparkIcon } from './icons'
import { Kbd } from './ui/Kbd'

/** Segundos que suele llevar cada respuesta, contando la pausa del acierto. */
const SECONDS_PER_ANSWER = 7

const PACE_LABEL: Record<Pace, string> = { steady: 'Afianzando', normal: 'Ritmo normal', fast: 'Acelerando' }

/**
 * La acción principal del inicio: la sesión inteligente, con lo que trae hoy (repasos, nuevas,
 * minutos), el ritmo que decidió el entrenador y el vocabulario que ya se reconoce.
 */
export function CoachCard({ now, onStart }: { now: number; onStart: () => void }) {
  const progress = useProgress()
  const events = useEvents()
  const { dailyGoal, newPerDay } = useSettings()
  const overview = coachOverview(progress, endOfDay(now))
  const today = todayStats(progress, now)
  const started = Object.keys(progress.cards).length > 0
  const pace = assessLearner(events).pace
  const newLeft = newPerDay === 0 ? null : Math.max(0, newPerDay - today.fresh)
  const remaining = Math.max(dailyGoal - today.answers, 0)
  const minutes = Math.max(1, Math.round(((remaining || dailyGoal) * SECONDS_PER_ANSWER) / 60))

  const plan = [
    overview.dueToday > 0 && plural(overview.dueToday, 'repaso'),
    newLeft === null ? 'palabras nuevas' : newLeft > 0 && plural(newLeft, 'nueva'),
    `unos ${minutes} min`,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onStart}
      aria-keyshortcuts="Enter"
      className={cn(
        'group relative mt-9 flex w-full animate-rise cursor-pointer items-center gap-4 overflow-hidden rounded-3xl p-5 text-left text-accent-ink sm:mt-10 sm:gap-6 sm:p-7',
        'bg-brand shadow-glow transition-[translate,scale,box-shadow] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
    >
      {/* Brillo decorativo: un resplandor claro en la esquina, sin información. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-accent-ink/15 blur-3xl"
      />
      <span className="relative min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase opacity-80">
            <SparkIcon width={14} height={14} />
            Sesión inteligente
          </span>
          {started && (
            <span className="rounded-full bg-accent-ink/15 px-2 py-0.5 text-[11px] font-semibold">
              {PACE_LABEL[pace]}
            </span>
          )}
        </span>
        <span className="mt-2 block font-display text-3xl leading-tight sm:text-4xl">
          {started ? 'Tu práctica de hoy' : 'Empieza aquí'}
        </span>
        <span className="mt-1.5 block text-sm opacity-85">
          {started
            ? plan.join(' · ')
            : 'Te guía palabra a palabra: de las más usadas a las más difíciles, repasando justo a tiempo.'}
        </span>
        {overview.known > 0 && (
          <span className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-accent-ink/12 px-3 py-1.5 text-xs font-medium">
            Reconoces {overview.known.toLocaleString('es')} {overview.known === 1 ? 'palabra' : 'palabras'} · nivel
            orientativo {overview.cefr}
          </span>
        )}
      </span>
      <span className="relative flex shrink-0 flex-col items-center gap-2">
        <span className="grid size-12 place-items-center rounded-full bg-accent-ink text-accent transition-transform group-hover:translate-x-0.5 sm:size-14">
          <ArrowRightIcon />
        </span>
        <Kbd tone="accent">Enter</Kbd>
      </span>
    </button>
  )
}
