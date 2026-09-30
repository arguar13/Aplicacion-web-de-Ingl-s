import { ALL_WORDS } from '@/lib/decks'
import { useEvents } from '@/lib/events'
import { plural } from '@/lib/format'
import { useProgress } from '@/lib/progress'
import { formatDuration } from '@/lib/stats'
import { weeklyReport } from '@/lib/weekly'
import { Surface } from '../ui/Surface'

const WORDS = new Map(ALL_WORDS.map((word) => [word.id, word]))

/**
 * Tu semana: lo hecho en los últimos 7 días, a qué hora rindes mejor y las palabras que más te
 * costaron (cada una abre su ficha para repasarla).
 */
export function WeekReport({ now, onOpenWord }: { now: number; onOpenWord: (id: string) => void }) {
  const report = weeklyReport(useEvents(), useProgress(), now)
  if (report.answers === 0) return null
  const facts = [
    { label: 'Respuestas', value: report.answers.toLocaleString('es') },
    { label: 'Acierto', value: report.accuracy === null ? '—' : `${Math.round(report.accuracy * 100)}%` },
    { label: 'Nuevas', value: report.newWords.toLocaleString('es') },
    { label: 'Dominadas', value: `+${report.masteredGain.toLocaleString('es')}` },
  ]
  return (
    <Surface as="section" aria-labelledby="tu-semana" className="mt-7 overflow-hidden px-5 pt-5 pb-6 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="tu-semana" className="text-[17px] font-semibold">
          Tu semana
        </h2>
        <p className="text-[13px] text-muted">
          {plural(report.activeDays, 'día')} de práctica · {formatDuration(report.ms)}
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl bg-bg px-4 py-3">
            <dt className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">{fact.label}</dt>
            <dd className="mt-1 font-display text-2xl tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {report.bestHours && (
        <p className="mt-4 text-sm">
          Rindes mejor entre las <strong className="font-semibold">{report.bestHours.from}:00</strong> y las{' '}
          <strong className="font-semibold">{report.bestHours.to}:00</strong> (
          {Math.round(report.bestHours.accuracy * 100)}% de acierto este mes).
        </p>
      )}
      {report.toughest.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] text-muted">Las que más te costaron:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {report.toughest.map(({ id, misses }) => {
              const word = WORDS.get(id)
              if (!word) return null
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onOpenWord(id)}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-raised px-3.5 text-sm transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span lang="en" className="font-semibold">
                      {word.en}
                    </span>
                    <span className="text-muted">
                      {misses} {misses === 1 ? 'fallo' : 'fallos'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Surface>
  )
}
