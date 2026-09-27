import { type ReactNode, useState } from 'react'
import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { useKeyDown } from '@/hooks/useKeyDown'
import { useNow } from '@/hooks/useNow'
import { LEVELS } from '@/lib/decks'
import { formatCount } from '@/lib/format'
import { useProgress } from '@/lib/progress'
import { useSettings } from '@/lib/settings'
import { forecast } from '@/lib/smartDecks'
import { activityWeeks, formatDuration, masteredSeries, totals, weeklyAccuracy } from '@/lib/stats'
import { type Track, trackOf } from '@/lib/types'
import { AchievementShelf } from '../achievements/AchievementShelf'
import { ForecastChart } from '../ForecastChart'
import { Header } from '../Header'
import { ArrowLeftIcon } from '../icons'
import { Segmented } from '../ui/controls'
import { Surface } from '../ui/Surface'
import { AccuracyChart, ActivityHeatmap, MasteredChart } from './charts'

const TRACK_OPTIONS: Array<{ value: Track; label: string }> = [
  { value: 'en-es', label: 'Traducir' },
  { value: 'es-en', label: 'Inverso' },
  { value: 'listen', label: 'Escuchar' },
  { value: 'type', label: 'Escribir' },
]

/** Estadísticas: actividad, evolución, precisión y avance por nivel. */
export function StatsScreen({ onExit }: { onExit: () => void }) {
  const progress = useProgress()
  const { mode, dailyGoal } = useSettings()
  const now = useNow()
  const [track, setTrack] = useState<Track>(trackOf(mode))
  const summaryOf = useDeckSummaries(track)
  const total = totals(progress, now)

  useKeyDown((event) => {
    if (event.key === 'Escape') onExit()
  })

  const tiles = [
    { label: 'Racha', value: `${formatCount(total.streak)} ${total.streak === 1 ? 'día' : 'días'}` },
    { label: 'Días practicados', value: formatCount(total.daysPracticed) },
    { label: 'Respuestas', value: formatCount(total.answers) },
    { label: 'Tiempo', value: formatDuration(total.ms) },
    { label: 'Precisión 30 d', value: total.accuracy30 === null ? '—' : `${Math.round(total.accuracy30 * 100)}%` },
  ]

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-14 sm:px-6">
        <button
          type="button"
          onClick={onExit}
          className="-ml-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeftIcon width={16} height={16} />
          Inicio
        </button>
        <h1 className="mt-4 font-display text-5xl leading-none">Tu progreso</h1>

        {/* Cinco datos: en el móvil, dos por fila y el último a lo ancho; desde tableta, tres y dos
            (en una sola fila no caben valores como "menos de 1 min"). */}
        <dl className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-6 sm:[&>*]:col-span-2 [&>*:last-child]:col-span-2 sm:[&>*:nth-last-child(-n+2)]:col-span-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <dt className="text-[10px] font-medium tracking-[0.14em] whitespace-nowrap text-muted uppercase">
                {tile.label}
              </dt>
              <dd className="mt-1 text-lg font-semibold whitespace-nowrap tabular-nums">{tile.value}</dd>
            </div>
          ))}
        </dl>

        <Section title="Actividad" subtitle="Palabras respondidas cada día, según tu meta diaria.">
          <ActivityHeatmap weeks={activityWeeks(progress.history, now, 26, dailyGoal)} />
        </Section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Section title="Palabras dominadas" subtitle="En alguna habilidad, los últimos 60 días.">
            <MasteredChart points={masteredSeries(progress.history, now, 60)} />
          </Section>
          <Section title="Precisión" subtitle="Acertadas a la primera, por semana.">
            <AccuracyChart weeks={weeklyAccuracy(progress.history, now, 8)} />
          </Section>
        </div>

        <Section title="Logros">
          <AchievementShelf now={now} />
        </Section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Por habilidad</h2>
          <Segmented label="Habilidad" value={track} options={TRACK_OPTIONS} onChange={setTrack} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr]">
          <Section title="Avance por nivel">
            <Legend />
            <ul className="mt-4 space-y-3">
              {LEVELS.map((deck) => {
                const summary = summaryOf(deck)
                const pct = (n: number) => `${(n / summary.total) * 100}%`
                return (
                  <li key={deck.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="text-muted">Nivel {deck.level}</span>
                    <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-line" aria-hidden>
                      {summary.mastered > 0 && <span className="bg-accent" style={{ width: pct(summary.mastered) }} />}
                      {summary.learning > 0 && (
                        <span className="bg-accent/40" style={{ width: pct(summary.learning) }} />
                      )}
                    </span>
                    <span className="text-xs text-muted tabular-nums">
                      <span className="font-semibold text-ink">{formatCount(summary.mastered)}</span> /{' '}
                      {formatCount(summary.total)}
                      <span className="sr-only"> dominadas, {formatCount(summary.learning)} aprendiendo</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </Section>
          <Section title="Próximos repasos" subtitle="Hoy y los próximos 6 días.">
            <ForecastChart counts={forecast(progress, track, now)} now={now} className="mt-6" />
          </Section>
        </div>
      </main>
    </>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Surface as="section" className="mt-4 px-5 pt-5 pb-6 sm:px-6">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </Surface>
  )
}

function Legend() {
  const items = [
    { label: 'Dominadas', swatch: 'bg-accent' },
    { label: 'Aprendiendo', swatch: 'bg-accent/40' },
    { label: 'Por descubrir', swatch: 'bg-line' },
  ]
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-[3px] ${item.swatch}`} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
