import type { ReactNode } from 'react'
import { LogoMark } from './icons'

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-5 sm:px-6 sm:pt-7 short:max-w-4xl short:pt-3">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="font-display text-[26px] leading-none tracking-tight">Tecla</span>
      </div>
      {children && <dl className="flex items-center gap-5 sm:gap-7">{children}</dl>}
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
