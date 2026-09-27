import type { ReactNode } from 'react'
import { LogoMark } from './icons'

export function Header({ children, action }: { children?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-5 sm:px-6 sm:pt-7 short:max-w-4xl short:pt-3">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="font-display text-[26px] leading-none tracking-tight">Tecla</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        {children && <dl className="flex items-center gap-5 sm:gap-7">{children}</dl>}
        {action}
      </div>
    </header>
  )
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="text-right">
      <dt className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="text-[15px] font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/** Palabras respondidas hoy frente a la meta diaria, con un anillo que se completa. */
export function GoalStat({ done, goal }: { done: number; goal: number }) {
  const ratio = Math.min(done / goal, 1)
  const complete = done >= goal
  const radius = 11
  const circumference = 2 * Math.PI * radius
  return (
    <div className="flex items-center gap-2">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        role="progressbar"
        aria-label="Meta de hoy"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(done, goal)}
        className={complete ? 'text-ok' : 'text-accent'}
      >
        <circle cx="14" cy="14" r={radius} fill="none" strokeWidth="3" className="stroke-line" />
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform="rotate(-90 14 14)"
          className="transition-[stroke-dashoffset] duration-500"
        />
        {complete && (
          <path
            d="m9.5 14.2 3 3 6-6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <Stat label="Hoy" value={`${Math.min(done, 999)}/${goal}`} />
    </div>
  )
}
