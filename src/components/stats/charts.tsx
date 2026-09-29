import { type KeyboardEvent, type PointerEvent, type ReactNode, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatCount } from '@/lib/format'
import type { ActivityDay, SeriesPoint, WeekAccuracy } from '@/lib/stats'

const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const monthName = new Intl.DateTimeFormat('es', { month: 'short' })
const fmtDate = (time: number) => shortDate.format(time).replace('.', '')

// --- Cursor compartido: puntero y flechas del teclado ---------------------------------------------

/**
 * Posición del cursor sobre una gráfica de `count` puntos: sigue al puntero (el más cercano en X) y
 * se mueve con las flechas cuando la gráfica tiene el foco. `null` sin cursor.
 */
function useChartCursor(count: number) {
  const [index, setIndex] = useState<number | null>(null)
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    setIndex(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))))
  }
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const step = event.key === 'ArrowLeft' ? -1 : 1
      setIndex((current) => Math.min(count - 1, Math.max(0, (current ?? count - 1) + (current === null ? 0 : step))))
    }
  }
  const clear = () => setIndex(null)
  return {
    index,
    handlers: { onPointerMove, onPointerLeave: clear, onKeyDown, onFocus: () => setIndex(count - 1), onBlur: clear },
  }
}

function Tooltip({ left, children }: { left: string; children: ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-raised px-3 py-1.5 text-center text-xs whitespace-nowrap shadow-float"
      style={{ left }}
    >
      {children}
    </div>
  )
}

// --- Mapa de calor --------------------------------------------------------------------------------

const LEVEL_CLASS = ['bg-line', 'bg-accent/25', 'bg-accent/45', 'bg-accent/70', 'bg-accent'] as const
/** Días de la semana a la izquierda del mapa: solo lunes, miércoles y viernes llevan letra. */
const WEEKDAYS = [
  { id: 'lun', label: 'L' },
  { id: 'mar', label: '' },
  { id: 'mie', label: 'X' },
  { id: 'jue', label: '' },
  { id: 'vie', label: 'V' },
  { id: 'sab', label: '' },
  { id: 'dom', label: '' },
] as const

export function ActivityHeatmap({ weeks }: { weeks: ActivityDay[][] }) {
  const [hover, setHover] = useState<{ day: ActivityDay; left: string } | null>(null)
  const active = weeks.flat().filter((day) => day.answers > 0).length
  // El mes se rotula en la semana en que empieza (su día 1…7), si queda sitio desde el anterior.
  const months: string[] = []
  let lastLabel = -Infinity
  for (const [i, week] of weeks.entries()) {
    const starts = i === 0 || new Date(week[0].time).getDate() <= 7
    const label = starts && i - lastLabel >= 3 ? monthName.format(week[0].time).replace('.', '') : ''
    if (label) lastLabel = i
    months.push(label)
  }

  return (
    <figure className="relative m-0">
      <div className="flex gap-1.5">
        <div aria-hidden className="grid shrink-0 grid-rows-[auto_repeat(7,1fr)] gap-[3px] text-[10px] text-muted">
          <span className="h-4" />
          {WEEKDAYS.map(({ id, label }) => (
            <span key={id} className="flex items-center leading-none">
              {label}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`Actividad de las últimas ${weeks.length} semanas: ${active} días con práctica`}
          className="grid min-w-0 flex-1 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
          onPointerLeave={() => setHover(null)}
        >
          {weeks.map((week, i) => (
            <span
              key={`m-${week[0].key}`}
              aria-hidden
              className="h-4 overflow-visible text-[10px] whitespace-nowrap text-muted capitalize"
            >
              {months[i]}
            </span>
          ))}
          {weeks[0].map((_row, dayIndex) =>
            weeks.map((week) => {
              const day = week[dayIndex]
              return (
                <span
                  key={day.key}
                  aria-hidden
                  onPointerEnter={(event) => {
                    const parent = event.currentTarget.parentElement?.getBoundingClientRect()
                    const rect = event.currentTarget.getBoundingClientRect()
                    if (!day.future && parent) {
                      setHover({ day, left: `${rect.left - parent.left + rect.width / 2 + 16}px` })
                    }
                  }}
                  className={cn(
                    'aspect-square rounded-[3px]',
                    day.future ? 'bg-transparent' : LEVEL_CLASS[day.level],
                    hover?.day.key === day.key && 'ring-2 ring-ink/40',
                  )}
                />
              )
            }),
          )}
        </div>
      </div>
      {hover && (
        <Tooltip left={hover.left}>
          <span className="font-semibold text-ink">{formatCount(hover.day.answers)} palabras</span>
          <span className="text-muted"> · {fmtDate(hover.day.time)}</span>
        </Tooltip>
      )}
      <figcaption className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        Menos
        {LEVEL_CLASS.map((level) => (
          <span key={level} aria-hidden className={cn('size-2.5 rounded-[3px]', level)} />
        ))}
        Más
      </figcaption>
    </figure>
  )
}

// --- Línea: dominadas en el tiempo ----------------------------------------------------------------

export function MasteredChart({ points }: { points: SeriesPoint[] }) {
  const { index, handlers } = useChartCursor(points.length)
  if (points.length < 2) {
    return <p className="py-10 text-center text-sm text-muted">Practica unos días más para ver tu evolución.</p>
  }
  const max = Math.max(...points.map((p) => p.value), 1)
  const top = niceCeil(max)
  const x = (i: number) => (i / (points.length - 1)) * 100
  const y = (value: number) => 100 - (value / top) * 100
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
  const area = `${line} L100,100 L0,100 Z`
  const last = points.at(-1)
  const cursor = index === null ? null : points[index]

  return (
    <figure className="relative m-0">
      <div className="flex gap-2">
        <div
          aria-hidden
          className="flex h-40 flex-col justify-between py-0 text-right text-[10px] text-muted tabular-nums"
        >
          <span>{formatCount(top)}</span>
          <span>0</span>
        </div>
        {/* Se recorre día a día con las flechas: para un lector de pantalla es un deslizador. */}
        <div
          tabIndex={0}
          role="slider"
          aria-label={`Palabras dominadas en los últimos ${points.length} días`}
          aria-valuemin={0}
          aria-valuemax={points.length - 1}
          aria-valuenow={index ?? points.length - 1}
          aria-valuetext={`${formatCount((cursor ?? last)?.value ?? 0)} dominadas · ${fmtDate((cursor ?? last)?.time ?? 0)}`}
          className="relative h-40 flex-1 cursor-crosshair rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
          {...handlers}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
            className="absolute inset-0 size-full overflow-visible"
          >
            <line
              x1="0"
              x2="100"
              y1="100"
              y2="100"
              className="stroke-line"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              x2="100"
              y1="0"
              y2="0"
              className="stroke-line"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <path d={area} className="fill-accent/10" />
            <path
              d={line}
              fill="none"
              className="stroke-accent"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {cursor && (
              <line
                x1={x(index ?? 0)}
                x2={x(index ?? 0)}
                y1="0"
                y2="100"
                className="stroke-ink/30"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {/* Marcadores en HTML: en el SVG estirado se deformarían. */}
          {last && (
            <span
              aria-hidden
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface"
              style={{ left: '100%', top: `${y(last.value)}%` }}
            />
          )}
          {cursor && (
            <>
              <span
                aria-hidden
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface"
                style={{ left: `${x(index ?? 0)}%`, top: `${y(cursor.value)}%` }}
              />
              <Tooltip left={`${x(index ?? 0)}%`}>
                <span className="font-semibold text-ink">{formatCount(cursor.value)} dominadas</span>
                <span className="text-muted"> · {fmtDate(cursor.time)}</span>
              </Tooltip>
            </>
          )}
        </div>
      </div>
      <div aria-hidden className="mt-1.5 flex justify-between pl-8 text-[10px] text-muted">
        <span>{fmtDate(points[0].time)}</span>
        <span>{fmtDate(points.at(-1)?.time ?? 0)}</span>
      </div>
    </figure>
  )
}

/** Tope redondo para el eje: 7 → 10, 23 → 25, 180 → 200. */
function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
}

// --- Columnas: precisión por semana ---------------------------------------------------------------

const describeWeek = (week: WeekAccuracy | undefined) =>
  !week
    ? ''
    : `Semana del ${fmtDate(week.start)}: ${
        week.accuracy === null ? 'sin práctica' : `${Math.round(week.accuracy * 100)} % a la primera`
      }`

export function AccuracyChart({ weeks }: { weeks: WeekAccuracy[] }) {
  const { index, handlers } = useChartCursor(weeks.length)
  const cursor = index === null ? null : weeks[index]
  return (
    <figure className="relative m-0">
      <div
        tabIndex={0}
        role="slider"
        aria-label={`Precisión de las últimas ${weeks.length} semanas`}
        aria-valuemin={0}
        aria-valuemax={weeks.length - 1}
        aria-valuenow={index ?? weeks.length - 1}
        aria-valuetext={describeWeek(cursor ?? weeks[weeks.length - 1])}
        className="relative flex h-36 items-end gap-2 border-b border-line outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
        {...handlers}
      >
        {weeks.map((week, i) => (
          <div key={week.start} className="flex h-full flex-1 flex-col items-center justify-end">
            <span
              className={cn(
                'mb-1 text-[11px] font-semibold tabular-nums',
                week.accuracy === null ? 'text-muted' : 'text-ink',
                i !== weeks.length - 1 && index !== i && 'opacity-0 sm:opacity-100',
              )}
            >
              {week.accuracy === null ? '—' : `${Math.round(week.accuracy * 100)}%`}
            </span>
            <div
              className={cn(
                'w-full max-w-6 rounded-t-[4px] transition-[height,opacity] duration-500',
                week.accuracy === null ? 'bg-line' : i === weeks.length - 1 ? 'bg-accent' : 'bg-accent/45',
                index === i && 'opacity-80',
              )}
              style={{ height: week.accuracy === null ? 2 : `${Math.max(week.accuracy * 80, 3)}%` }}
            />
          </div>
        ))}
        {cursor && (
          <Tooltip left={`${((index ?? 0) + 0.5) * (100 / weeks.length)}%`}>
            <span className="font-semibold text-ink">
              {cursor.accuracy === null ? 'Sin práctica' : `${Math.round(cursor.accuracy * 100)}% a la primera`}
            </span>
            <span className="text-muted">
              {' '}
              · {formatCount(cursor.answers)} palabras · semana del {fmtDate(cursor.start)}
            </span>
          </Tooltip>
        )}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-2 text-[10px] text-muted">
        {/* En el móvil no caben todas las fechas: una semana de cada dos. */}
        {weeks.map((week, i) => (
          <span
            key={week.start}
            className={cn(
              'flex-1 text-center whitespace-nowrap',
              (weeks.length - 1 - i) % 2 === 1 && 'invisible sm:visible',
            )}
          >
            {fmtDate(week.start)}
          </span>
        ))}
      </div>
    </figure>
  )
}
