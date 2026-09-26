import type { QuizStats } from '@/hooks/useQuiz'
import { LogoMark } from './icons'

export function Header({ stats }: { stats?: QuizStats }) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center short:max-w-4xl justify-between gap-4 px-4 pt-5 sm:px-6 sm:pt-7 short:pt-3">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="font-display text-[26px] leading-none tracking-tight">Tecla</span>
      </div>

      {stats && (
        <dl className="flex items-center gap-5 sm:gap-7">
          <Stat label="Racha" value={stats.streak} />
          <Stat label="Precisión" value={stats.solved ? `${Math.round((stats.firstTry / stats.solved) * 100)}%` : '—'} />
          <Stat label="Palabras" value={stats.solved} />
        </dl>
      )}
    </header>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <dt className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="text-[15px] font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
