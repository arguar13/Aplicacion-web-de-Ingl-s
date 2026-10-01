import { cn } from '@/lib/cn'
import { formatCount, plural } from '@/lib/format'
import { CEFR_LEVELS, formatEta, journey, MIN_PACE_DAYS, PACE_WINDOW_DAYS } from '@/lib/journey'
import { type ProgressData } from '@/lib/progress'
import { DAY } from '@/lib/scheduler'

const monthYear = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })

/** "0,5", "3", "12": sin decimales salvo por debajo de 1 al día. */
const formatPace = (pace: number) =>
  pace < 1 ? pace.toLocaleString('es', { maximumFractionDigits: 1 }) : formatCount(Math.round(pace))

/**
 * Tu camino: la escala A1–C2 con la posición actual (por palabras dominadas), el ritmo de los
 * últimos 30 días y cuándo se llegaría a cada nivel si se mantiene.
 */
export function JourneyCard({ progress, now }: { progress: ProgressData; now: number }) {
  const result = journey(progress, now)
  const { current, next, pace } = result
  const last = CEFR_LEVELS[CEFR_LEVELS.length - 1]
  // Posición en la escala: cada nivel ocupa el mismo tramo; dentro del tramo, el avance real.
  const position = ((CEFR_LEVELS.indexOf(current) + result.progress) / (CEFR_LEVELS.length - 1)) * 100
  const paceText =
    pace === null
      ? `El ritmo se calcula con al menos ${MIN_PACE_DAYS} días de práctica en los últimos ${PACE_WINDOW_DAYS}.`
      : pace === 0
        ? `Sin dominadas nuevas en los últimos ${plural(result.observedDays, 'día')}: los repasos las traerán.`
        : `Ritmo de los últimos ${plural(result.observedDays, 'día')}: ${formatPace(pace)} dominadas al día.`

  return (
    <div>
      <p className="text-[15px] leading-relaxed">
        Dominas <strong className="font-semibold tabular-nums">{formatCount(result.mastered)}</strong>{' '}
        {result.mastered === 1 ? 'palabra' : 'palabras'}: nivel orientativo{' '}
        <strong className="font-semibold">{current.label}</strong>, {current.description.toLowerCase()}.
        {next && (
          <>
            {' '}
            Para {next.label} faltan{' '}
            <strong className="font-semibold tabular-nums">{formatCount(next.words - result.mastered)}</strong>.
          </>
        )}
      </p>

      <div className="relative mt-6 pt-3 pb-7">
        <div
          role="progressbar"
          aria-label="Camino de A1 a C2"
          aria-valuemin={0}
          aria-valuemax={last.words}
          aria-valuenow={Math.min(result.mastered, last.words)}
          aria-valuetext={`${formatCount(result.mastered)} palabras dominadas, nivel ${current.label}`}
          className="h-2 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-700"
            style={{ width: `${position}%` }}
          />
        </div>
        <ol className="absolute inset-x-0 top-0 h-full" aria-hidden>
          {CEFR_LEVELS.map((level, index) => {
            const reached = level.words <= result.mastered
            const left = `${(index / (CEFR_LEVELS.length - 1)) * 100}%`
            return (
              <li
                key={level.label}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left }}
              >
                <span
                  className={cn(
                    'mt-1.5 block size-5 rounded-full border-2 bg-surface',
                    reached ? 'border-accent bg-accent' : 'border-line-strong',
                    level === current && 'ring-4 ring-accent/25',
                  )}
                />
                <span className={cn('mt-1.5 text-[11px] font-semibold', reached ? 'text-accent' : 'text-muted')}>
                  {level.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <p className="mt-3 text-[13px] text-muted">{paceText}</p>
      {result.eta.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {result.eta.map(({ level, days }) => (
            <li
              key={level.label}
              className="flex items-center justify-between gap-3 rounded-2xl bg-bg px-4 py-2.5 text-sm"
            >
              <span>
                <span className="font-semibold">{level.label}</span>
                <span className="text-muted"> · {formatCount(level.words)} palabras</span>
              </span>
              <span className="text-right text-muted tabular-nums">
                {days === null ? '—' : `${formatEta(days)} · ${monthYear.format(now + days * DAY)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
