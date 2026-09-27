import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { LogoMark } from './icons'

export function Header({ children, action }: { children?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-5 sm:px-6 sm:pt-7 short:max-w-4xl short:pt-3">
      <div className="flex shrink-0 items-center gap-2.5">
        <LogoMark />
        {/* En pantallas estrechas con estadísticas no cabe el nombre: queda el icono (y el nombre para lectores de pantalla). */}
        <span
          className={cn(
            'font-display text-[26px] leading-none tracking-tight',
            children ? 'max-[27.5rem]:sr-only' : false,
          )}
        >
          Tecla
        </span>
      </div>
      <div className="flex items-center gap-3 max-[25rem]:gap-2 sm:gap-5">
        {children && <dl className="flex items-center gap-4 max-[25rem]:gap-2.5 sm:gap-7">{children}</dl>}
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
  // En un <dl>, cada grupo solo puede contener <dt> y <dd>: el anillo va dentro del <dd>.
  return (
    <div className="relative pl-9 text-right">
      <dt className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">Hoy</dt>
      <dd className="text-[15px] font-semibold tabular-nums">
        {`${Math.min(done, 999)}/${goal}`}
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          role="progressbar"
          aria-label="Meta de hoy"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(done, goal)}
          className={`absolute top-1/2 left-0 -translate-y-1/2 ${complete ? 'text-ok' : 'text-accent'}`}
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
      </dd>
    </div>
  )
}
