import { type ReactNode, useId } from 'react'
import { cn } from '@/lib/cn'
import { formatCount } from '@/lib/format'
import { currentStreak, todayStats, useProgress } from '@/lib/progress'
import { useSettings } from '@/lib/settings'
import { rankOf } from '@/lib/xp'
import { BoltIcon, CheckCircleIcon, FlameIcon } from './icons'

/**
 * Hoy, de un vistazo: el anillo de la meta diaria y, debajo, la racha, las palabras dominadas y el
 * rango con su experiencia.
 */
export function TodayCard({ now, mastered }: { now: number; mastered: number }) {
  const progress = useProgress()
  const { dailyGoal } = useSettings()
  const done = todayStats(progress, now).answers
  const streak = currentStreak(progress, now)
  const status = rankOf(progress.xp)
  const left = Math.max(dailyGoal - done, 0)

  return (
    <section
      aria-labelledby="hoy-titulo"
      className="flex h-full animate-rise flex-col rounded-3xl border border-line bg-surface spotlight p-5 shadow-card sm:p-6 md:max-lg:grid md:max-lg:grid-cols-2 md:max-lg:items-center md:max-lg:gap-x-8"
    >
      <h2
        id="hoy-titulo"
        className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase md:max-lg:col-span-2"
      >
        Hoy
      </h2>
      <div className="mt-4 flex items-center gap-5">
        <GoalRing done={done} goal={dailyGoal} />
        <div className="min-w-0">
          <p className="font-display text-4xl leading-none tabular-nums">
            {formatCount(Math.min(done, 999))}
            <span className="text-xl text-muted">/{dailyGoal}</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {left === 0 ? '¡Meta cumplida! Todo lo que sumes es extra.' : `Te faltan ${formatCount(left)} para tu meta`}
          </p>
        </div>
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2 pt-6 md:max-lg:mt-4 md:max-lg:pt-0">
        <MiniStat
          icon={<FlameIcon width={16} height={16} />}
          tone="gold"
          label="Racha"
          value={`${streak} ${streak === 1 ? 'día' : 'días'}`}
        />
        <MiniStat
          icon={<CheckCircleIcon width={16} height={16} />}
          tone="ok"
          label="Dominadas"
          value={formatCount(mastered)}
        />
        <MiniStat
          icon={<BoltIcon width={16} height={16} />}
          tone="accent"
          label={status.rank.name}
          value={`${formatCount(progress.xp)} XP`}
        />
      </dl>
    </section>
  )
}

const TONES = {
  gold: 'bg-gold-soft text-gold',
  ok: 'bg-ok-soft text-ok',
  accent: 'bg-accent-soft text-accent',
} as const

function MiniStat({
  icon,
  tone,
  label,
  value,
}: {
  icon: ReactNode
  tone: keyof typeof TONES
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-bg/70 p-3">
      {/* En un <dl>, cada grupo solo puede contener <dt> y <dd>: el icono va dentro del <dt>. */}
      <dt className="text-[11px] text-muted">
        <span aria-hidden className={cn('grid size-7 place-items-center rounded-full', TONES[tone])}>
          {icon}
        </span>
        <span className="mt-2 block truncate">{label}</span>
      </dt>
      <dd className="truncate text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/** Anillo de la meta de hoy con el degradado de marca; verde y con una marca al cumplirla. */
function GoalRing({ done, goal }: { done: number; goal: number }) {
  const gradient = useId()
  const ratio = Math.min(done / goal, 1)
  const complete = done >= goal
  const radius = 42
  const circumference = 2 * Math.PI * radius
  return (
    <svg
      width="104"
      height="104"
      viewBox="0 0 104 104"
      role="progressbar"
      aria-label="Meta de hoy"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={Math.min(done, goal)}
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: complete ? 'var(--ok)' : 'var(--accent)' }} />
          <stop offset="1" style={{ stopColor: complete ? 'var(--ok)' : 'var(--accent-3)' }} />
        </linearGradient>
      </defs>
      <circle cx="52" cy="52" r={radius} fill="none" strokeWidth="10" className="stroke-line" />
      <circle
        cx="52"
        cy="52"
        r={radius}
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        transform="rotate(-90 52 52)"
        className="transition-[stroke-dashoffset] duration-700"
      />
      {complete ? (
        <path
          d="m40 53 8 8 17-18"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-ok"
        />
      ) : (
        <text
          x="52"
          y="58"
          textAnchor="middle"
          className="fill-ink font-display text-[17px] font-semibold tabular-nums"
        >
          {Math.round(ratio * 100)}%
        </text>
      )}
    </svg>
  )
}
