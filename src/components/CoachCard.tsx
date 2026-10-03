import { assessLearner, coachFrontier, coachOverview, type Pace } from '@/lib/coach'
import { ALL_WORDS, LEVEL_SIZE, LEVELS } from '@/lib/decks'
import { cn } from '@/lib/cn'
import { useEvents } from '@/lib/events'
import { plural } from '@/lib/format'
import { newWordsLeft, todayStats, useProgress } from '@/lib/progress'
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
  const { dailyGoal, newPerDay, startLevel } = useSettings()
  const overview = coachOverview(progress, endOfDay(now))
  const today = todayStats(progress, now)
  const started = Object.keys(progress.cards).length > 0
  const pace = assessLearner(events).pace
  const newLeft = newWordsLeft(progress, newPerDay, now)
  // El recorrido es secuencial: por qué palabra va y en qué nivel cae.
  const frontier = coachFrontier(progress, (startLevel - 1) * LEVEL_SIZE)
  const frontierLevel = frontier.rank === null ? null : LEVELS[Math.floor(frontier.rank / LEVEL_SIZE)]
  const remaining = Math.max(dailyGoal - today.answers, 0)
  const minutes = Math.max(1, Math.round(((remaining || dailyGoal) * SECONDS_PER_ANSWER) / 60))

  const plan = [
    overview.dueToday > 0 && plural(overview.dueToday, 'repaso'),
    newLeft === null ? 'palabras nuevas' : newLeft > 0 ? plural(newLeft, 'nueva') : 'nuevas de hoy: hechas',
    `unos ${minutes} min`,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onStart}
      aria-keyshortcuts="Enter"
      className={cn(
        'group ring-epic flex h-full w-full animate-rise cursor-pointer items-center gap-4 rounded-[1.75rem] text-left text-accent-ink sm:gap-6',
        'shadow-hero transition-[translate,scale,box-shadow] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
    >
      {/* Fondo con el degradado de marca, brillos y una trama de ondas: decorativo, sin información.
          Va en su propia capa recortada para que el borde de luz (ring-epic) quede por fuera. */}
      <span
        aria-hidden
        className="shine pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] bg-brand"
      >
        <span className="absolute -top-24 -right-16 size-72 rounded-full bg-white/20 blur-3xl" />
        <span className="absolute -bottom-28 -left-10 size-64 rounded-full bg-accent-3/40 blur-3xl" />
        <svg className="absolute -right-10 -bottom-16 size-80 opacity-[0.14]" viewBox="0 0 200 200" fill="none">
          {[30, 50, 70, 90].map((r) => (
            <circle key={r} cx="150" cy="150" r={r} stroke="#fff" strokeWidth="1.5" />
          ))}
        </svg>
      </span>
      <span className="relative min-w-0 flex-1 py-6 pl-6 sm:py-8 sm:pl-8">
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
        <span className="mt-2 block font-display text-3xl leading-tight sm:text-[2.6rem]">
          {started ? 'Tu práctica de hoy' : 'Empieza aquí'}
        </span>
        <span className="mt-1.5 block text-sm opacity-85">
          {started
            ? plan.join(' · ')
            : 'Te guía palabra a palabra: de las más usadas a las más difíciles, repasando justo a tiempo.'}
        </span>
        {started && (
          <span className="mt-4 flex flex-wrap gap-2">
            {frontier.rank !== null && frontierLevel && (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-accent-ink/12 px-3 py-1.5 text-xs font-medium tabular-nums">
                Siguiente: palabra nº {(frontier.rank + 1).toLocaleString('es')} de{' '}
                {ALL_WORDS.length.toLocaleString('es')} · nivel {frontierLevel.level}
              </span>
            )}
            {overview.known > 0 && (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-accent-ink/12 px-3 py-1.5 text-xs font-medium">
                Reconoces {overview.known.toLocaleString('es')} {overview.known === 1 ? 'palabra' : 'palabras'} · nivel
                orientativo {overview.cefr}
              </span>
            )}
          </span>
        )}
      </span>
      <span className="relative flex shrink-0 flex-col items-center gap-2 pr-6 sm:pr-8">
        <span className="grid size-12 place-items-center rounded-full bg-accent-ink text-accent shadow-float transition-transform group-hover:translate-x-1 sm:size-16">
          <ArrowRightIcon />
        </span>
        <Kbd tone="accent">Enter</Kbd>
      </span>
    </button>
  )
}
