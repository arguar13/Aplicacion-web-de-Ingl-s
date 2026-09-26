import { cn } from '@/lib/cn'
import type { DeckSummary } from '@/lib/scheduler'

/** Barra de dos tramos: dominadas (sólido) y aprendiendo (suave) sobre el total. */
export function ProgressBar({ summary, className }: { summary: DeckSummary; className?: string }) {
  const pct = (n: number) => `${(n / Math.max(summary.total, 1)) * 100}%`
  return (
    <div
      role="progressbar"
      aria-label="Palabras dominadas"
      aria-valuemin={0}
      aria-valuemax={summary.total}
      aria-valuenow={summary.mastered}
      className={cn('flex h-1.5 overflow-hidden rounded-full bg-line', className)}
    >
      <div className="bg-accent transition-[width] duration-500" style={{ width: pct(summary.mastered) }} />
      <div className="bg-accent/35 transition-[width] duration-500" style={{ width: pct(summary.learning) }} />
    </div>
  )
}
