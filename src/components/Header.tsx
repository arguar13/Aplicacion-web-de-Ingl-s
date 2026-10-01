import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { LogoMark } from './icons'

/** Logo y nombre de la app. Con `compact`, en pantallas estrechas queda solo el logo. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <LogoMark className="drop-shadow-[0_6px_14px_rgb(124_58_237_/_0.35)]" />
      <span className={cn('font-display text-[21px] leading-none', compact && 'max-[26rem]:sr-only')}>
        Open<span className="text-brand">Speak</span>
      </span>
    </div>
  )
}

export function Header({
  children,
  action,
  wide = false,
}: {
  children?: ReactNode
  action?: ReactNode
  /** A lo ancho del panel de inicio (en escritorio usa más columnas que el resto de pantallas). */
  wide?: boolean
}) {
  return (
    // Cabecera fija de vidrio esmerilado: queda a mano al desplazarse sin tapar el contenido.
    <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/70 backdrop-blur-xl backdrop-saturate-150">
      <div
        className={cn(
          'mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 short:py-2',
          wide ? 'max-w-6xl' : 'max-w-3xl short:max-w-4xl',
        )}
      >
        {/* En pantallas estrechas con estadísticas no cabe el nombre: queda el logo (y el nombre para lectores de pantalla). */}
        <Brand compact={Boolean(children)} />
        <div className="flex items-center gap-3 max-[25rem]:gap-2 sm:gap-5">
          {children && <dl className="flex items-center gap-4 max-[25rem]:gap-2.5 sm:gap-7">{children}</dl>}
          {action}
        </div>
      </div>
    </header>
  )
}

export function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('text-right', className)}>
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
