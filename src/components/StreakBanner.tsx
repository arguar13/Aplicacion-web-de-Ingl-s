import { plural } from '@/lib/format'
import { currentStreak, dayKey, type ProgressData } from '@/lib/progress'
import { FlameIcon, ShieldIcon } from './icons'

const DAY = 24 * 60 * 60 * 1000

/**
 * Aviso en el inicio cuando hay racha y hoy aún no se practicó: cuánto dura, que hoy la mantiene, y
 * los protectores que la cuidan si un día no se puede.
 */
export function StreakBanner({ progress, now }: { progress: ProgressData; now: number }) {
  const streak = currentStreak(progress, now)
  const practicedToday = progress.days.includes(dayKey(now))
  if (streak === 0 || practicedToday) return null
  const savedYesterday = progress.frozenDays.includes(dayKey(now - DAY))

  return (
    <aside
      aria-labelledby="streak-banner-title"
      className="mt-4 flex animate-rise items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 sm:p-5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-bad-soft text-bad">
        <FlameIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span id="streak-banner-title" className="block text-[15px] font-semibold">
          Tu racha de {plural(streak, 'día')} te espera
        </span>
        <span className="block text-[13px] leading-snug text-muted">
          {savedYesterday
            ? 'Ayer un protector la cuidó. Practica hoy para seguir sumando.'
            : 'Practica hoy para no perderla.'}
        </span>
      </span>
      <span
        className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums"
        title="Protectores de racha: cuidan un día sin práctica. Se gana uno cada 7 días seguidos."
      >
        <ShieldIcon width={18} height={18} className={progress.freezes ? 'text-accent' : 'text-muted'} />
        {progress.freezes}
        <span className="sr-only">{progress.freezes === 1 ? 'protector' : 'protectores'} de racha</span>
      </span>
    </aside>
  )
}
