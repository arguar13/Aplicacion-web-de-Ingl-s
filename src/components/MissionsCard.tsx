import { cn } from '@/lib/cn'
import { useEvents } from '@/lib/events'
import { formatCount } from '@/lib/format'
import { evaluateMissions, missionInput } from '@/lib/missions'
import { dayKey, useProgress } from '@/lib/progress'
import { rankOf } from '@/lib/xp'
import { CheckCircleIcon, FlagIcon } from './icons'

/**
 * Hoy: el rango del estudiante con su experiencia y las tres misiones del día, con su avance. Cada
 * misión cumplida suma experiencia; el rango sube con ella.
 */
export function MissionsCard({ now }: { now: number }) {
  const progress = useProgress()
  const events = useEvents()
  const day = dayKey(now)
  const missions = evaluateMissions(day, missionInput(progress, events, now))
  const done = progress.missions.day === day ? progress.missions.done : []
  const status = rankOf(progress.xp)
  const completed = missions.filter((m) => m.done).length

  return (
    <section
      aria-labelledby="misiones-del-dia"
      className="mt-4 animate-rise rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="misiones-del-dia" className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
            Misiones de hoy
          </h2>
          <p className="mt-1 text-sm text-muted">
            {completed === missions.length
              ? '¡Las tres cumplidas! Mañana habrá otras.'
              : `${formatCount(completed)} de ${formatCount(missions.length)} cumplidas · cada una suma experiencia`}
          </p>
        </div>
        <RankPill xp={progress.xp} level={status.level} name={status.rank.name} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={`Rango ${status.rank.name}: avance al siguiente`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(status.progress * 100)}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${status.progress * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] text-muted tabular-nums">
          {status.next ? `${formatCount(status.next.xp - progress.xp)} XP para ${status.next.name}` : 'Rango máximo'}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {missions.map(({ mission, value, target, done: isDone }) => {
          const rewarded = done.includes(mission.id)
          return (
            <li key={mission.id} className="flex items-center gap-3.5 py-3 first:pt-1 last:pb-0">
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full transition-colors',
                  isDone ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent',
                )}
              >
                {isDone ? <CheckCircleIcon /> : <FlagIcon width={18} height={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[15px] font-semibold', isDone && 'text-muted line-through')}>
                  {mission.title}
                </span>
                <span className="block text-[13px] leading-snug text-muted">{mission.description}</span>
                {!isDone && (
                  <span className="mt-1.5 flex items-center gap-2">
                    <span
                      role="progressbar"
                      aria-label={`Avance: ${mission.title}`}
                      aria-valuemin={0}
                      aria-valuemax={target}
                      aria-valuenow={value}
                      className="h-1 max-w-48 flex-1 overflow-hidden rounded-full bg-line"
                    >
                      <span
                        className="block h-full rounded-full bg-accent/60"
                        style={{ width: `${(value / target) * 100}%` }}
                      />
                    </span>
                    <span className="text-[11px] text-muted tabular-nums">
                      {formatCount(value)}/{formatCount(target)}
                    </span>
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
                  rewarded ? 'bg-ok-soft text-ok' : 'bg-bg text-muted',
                )}
              >
                +{mission.xp} XP
                {rewarded && <span className="sr-only"> conseguidos</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Rango y experiencia, en una pastilla. */
export function RankPill({ xp, level, name }: { xp: number; level: number; name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent-soft py-1 pr-3 pl-1 text-xs font-semibold text-accent">
      <span className="grid size-6 place-items-center rounded-full bg-brand text-[11px] text-accent-ink tabular-nums">
        {level}
      </span>
      {name}
      <span className="font-medium tabular-nums">{formatCount(xp)} XP</span>
    </span>
  )
}
