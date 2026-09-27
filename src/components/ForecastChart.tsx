import { cn } from '@/lib/cn'
import { formatCount, plural } from '@/lib/format'
import { dayKey } from '@/lib/progress'

const weekday = new Intl.DateTimeFormat('es', { weekday: 'short' })
const DAY = 24 * 60 * 60 * 1000

function dayLabel(index: number, now: number): string {
  if (index === 0) return 'Hoy'
  const label = weekday.format(now + index * DAY).replace('.', '')
  return label.charAt(0).toUpperCase() + label.slice(1, 3)
}

/**
 * Repasos de los próximos días en columnas. Una sola serie: hoy en el acento, el resto en un tono
 * más suave. El valor de cada día aparece al pasar el cursor; la tabla oculta lo da a los lectores
 * de pantalla (el gráfico en sí es decorativo para ellos).
 */
export function ForecastChart({
  counts,
  now,
  className,
}: {
  counts: readonly number[]
  now: number
  className?: string
}) {
  const max = Math.max(...counts, 1)
  // Cada columna es un día concreto: su fecha es la clave.
  const days = counts.map((count, index) => ({ count, index, key: dayKey(now + index * DAY) }))
  return (
    <figure className={cn('m-0', className)}>
      <div aria-hidden className="flex h-14 items-end gap-2">
        {days.map(({ count, index, key }) => (
          <div key={key} className="group relative flex h-full flex-1 flex-col items-center justify-end">
            <span className="pointer-events-none absolute -top-5 text-[11px] font-semibold text-ink tabular-nums opacity-0 transition-opacity pointer-fine:group-hover:opacity-100">
              {formatCount(count)}
            </span>
            <div
              className={cn(
                'w-full max-w-4 rounded-t-[4px] transition-[height] duration-500',
                count === 0 ? 'bg-line' : index === 0 ? 'bg-accent' : 'bg-accent/40',
              )}
              style={{ height: count === 0 ? 2 : `${Math.max((count / max) * 100, 8)}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-2">
        {days.map(({ index, key }) => (
          <span
            key={key}
            className={cn('flex-1 text-center text-[10px] text-muted', index === 0 && 'font-semibold text-ink')}
          >
            {dayLabel(index, now)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Repasos de los próximos {counts.length} días</caption>
        <tbody>
          {days.map(({ count, index, key }) => (
            <tr key={key}>
              <th scope="row">{index === 0 ? 'Hoy' : index === 1 ? 'Mañana' : weekday.format(now + index * DAY)}</th>
              <td>{plural(count, 'repaso')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
