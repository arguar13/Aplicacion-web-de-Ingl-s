import { useId, useState } from 'react'
import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { cn } from '@/lib/cn'
import { ALL_DECK, type Deck, LEVELS, samplePreview } from '@/lib/decks'
import type { DeckSummary } from '@/lib/scheduler'
import { type Mode, type Track, trackOf } from '@/lib/types'
import { cardBase, shortcutOf } from './homeCards'
import { ArrowRightIcon, ShuffleIcon } from './icons'
import { MODE_INFO, MODE_ORDER } from './modeInfo'
import { ProgressBar } from './ProgressBar'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'

/** Niveles que se ven de entrada en el inicio. */
const LEVELS_SHOWN = 6

type SummaryOf = (deck: Deck) => DeckSummary

/**
 * El nivel por el que se va en una habilidad: el último elegido mientras le quede algo (nuevas o
 * repasos); si no, el siguiente con palabras por ver, en orden. Así el recorrido avanza solo.
 */
export function currentLevel(summaryOf: SummaryOf, lastDeckId: string | null): Deck {
  const lastIndex = LEVELS.findIndex((deck) => deck.id === lastDeckId)
  if (lastIndex >= 0) {
    const summary = summaryOf(LEVELS[lastIndex])
    if (summary.fresh > 0 || summary.due > 0) return LEVELS[lastIndex]
  }
  const pending = (deck: Deck) => summaryOf(deck).fresh > 0
  return LEVELS.slice(Math.max(lastIndex, 0)).find(pending) ?? LEVELS.find(pending) ?? ALL_DECK
}

/**
 * «Practica por tu cuenta»: cada modo empieza al instante, en el nivel por el que vas en esa
 * habilidad; debajo, todos los niveles para elegir otro. Va al final del inicio y se carga aparte
 * (no hace falta para el primer pintado).
 */
export function PracticeSection({
  mode,
  lastDeckId,
  onPractice,
  onPick,
}: {
  /** El último modo usado: con él se abren los niveles de la lista. */
  mode: Mode
  lastDeckId: string | null
  onPractice: (deck: Deck, mode: Mode) => void
  onPick: (deck: Deck) => void
}) {
  // Cada habilidad lleva su progreso: el nivel en curso de «escuchar» no tiene por qué ser el de «traducir».
  const summaries: Record<Track, SummaryOf> = {
    'en-es': useDeckSummaries('en-es'),
    'es-en': useDeckSummaries('es-en'),
    listen: useDeckSummaries('listen'),
    type: useDeckSummaries('type'),
  }
  const summaryOf = summaries[trackOf(mode)]
  const total = summaryOf(ALL_DECK)
  const current = currentLevel(summaryOf, lastDeckId)
  // Los primeros niveles y el que se está practicando; el resto, a un toque (son 17).
  const [showAllLevels, setShowAllLevels] = useState(false)
  const levelsId = useId()
  const visibleLevels = showAllLevels
    ? LEVELS
    : LEVELS.filter((deck, index) => index < LEVELS_SHOWN || deck.id === current.id)

  return (
    <>
      <section aria-labelledby="por-tu-cuenta" className="mt-14 sm:mt-16">
        <h2 id="por-tu-cuenta" className="font-display text-3xl">
          Practica por tu cuenta
        </h2>
        <p className="mt-1 text-sm text-muted">
          Toca un modo y empiezas al instante, en el nivel por el que vas. Al terminar un nivel, sigues con el
          siguiente.
        </p>
        {/* Dos o tres por fila (el último, a lo ancho) y, en escritorio, los siete en una fila. */}
        <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-7">
          {MODE_ORDER.map((option, index) => {
            const deck = currentLevel(summaries[trackOf(option)], lastDeckId)
            return (
              <li
                key={option}
                className={cn('animate-rise', index === MODE_ORDER.length - 1 && 'max-lg:col-span-full lg:col-span-1')}
                style={{ animationDelay: `${index * 35}ms`, animationFillMode: 'both' }}
              >
                <ModeTile
                  mode={option}
                  deck={deck}
                  summary={summaries[trackOf(option)](deck)}
                  last={option === mode}
                  onStart={() => onPractice(deck, option)}
                />
              </li>
            )
          })}
        </ul>
      </section>

      <div className="mt-12 mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">Todos los niveles</h2>
        <p className="text-xs text-muted">
          Se abren en modo <span className="font-semibold text-ink">{MODE_INFO[mode].label.toLowerCase()}</span>, el
          último que usaste.
        </p>
      </div>
      <ul id={levelsId} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {visibleLevels.map((deck, index) => (
          <li
            key={deck.id}
            className="animate-rise"
            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
          >
            <LevelCard deck={deck} summary={summaryOf(deck)} current={deck.id === current.id} onPick={onPick} />
          </li>
        ))}
        <li
          className="animate-rise sm:col-span-2 lg:col-span-3"
          style={{ animationDelay: `${visibleLevels.length * 40}ms`, animationFillMode: 'both' }}
        >
          <AllWordsCard summary={total} onPick={onPick} />
        </li>
      </ul>
      {!showAllLevels && (
        <div className="mt-5 flex justify-center">
          <Button onClick={() => setShowAllLevels(true)} aria-controls={levelsId} aria-expanded={false}>
            Ver los {LEVELS.length} niveles
          </Button>
        </div>
      )}
    </>
  )
}

/** Qué queda en el nivel, en corto: repasos primero (es lo que toca), si no, las nuevas. */
function pendingLabel(summary: DeckSummary): string {
  if (summary.due > 0) return `${summary.due.toLocaleString('es')} ${summary.due === 1 ? 'repaso' : 'repasos'}`
  if (summary.fresh > 0) return `${summary.fresh.toLocaleString('es')} ${summary.fresh === 1 ? 'nueva' : 'nuevas'}`
  return 'Todo visto'
}

/** Un modo de práctica: al tocarlo, empieza ya en el nivel en curso de esa habilidad. */
function ModeTile({
  mode,
  deck,
  summary,
  last,
  onStart,
}: {
  mode: Mode
  deck: Deck
  summary: DeckSummary
  last: boolean
  onStart: () => void
}) {
  const { label, hint, Icon } = MODE_INFO[mode]
  const where = deck.level === null ? deck.name : `Nivel ${deck.level}`
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={`${label}: practicar ${where.toLowerCase()}`}
      className={cn(
        cardBase,
        'flex h-full flex-col gap-3 bg-surface p-4 shadow-card hover:border-accent/40 hover:shadow-key-hover',
        last ? 'border-accent/45' : 'border-line',
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent transition-[transform,background-color,color] duration-200 group-hover:-rotate-6 group-hover:bg-brand group-hover:text-accent-ink">
          <Icon />
        </span>
        {last ? (
          <Badge tone="accent-soft" caps>
            Último
          </Badge>
        ) : (
          <ArrowRightIcon
            width={18}
            height={18}
            aria-hidden
            className="text-muted opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        )}
      </span>
      <span className="block">
        <span className="block text-[15px] font-semibold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className="mt-auto block w-full">
        <ProgressBar summary={summary} />
        <span className="mt-1.5 flex items-baseline justify-between gap-2 text-[11px] text-muted tabular-nums">
          <span className="font-semibold text-ink/80">{where}</span>
          <span className="truncate">{pendingLabel(summary)}</span>
        </span>
      </span>
    </button>
  )
}

function DueBadge({ count }: { count: number }) {
  if (count === 0) return null
  return <Badge tone="accent">{count.toLocaleString('es')} por repasar</Badge>
}

function LevelCard({
  deck,
  summary,
  current,
  onPick,
}: {
  deck: Deck
  summary: DeckSummary
  current: boolean
  onPick: (deck: Deck) => void
}) {
  const shortcut = shortcutOf(deck)
  const started = summary.fresh < summary.total
  const details = useId()
  return (
    // Nombre corto y preciso ("Nivel 13, Erudito"); el resto de la tarjeta queda como descripción.
    // Sin esto, el nombre sería todo su texto ("…sin diccionario") y chocaría con otros botones.
    <button
      type="button"
      onClick={() => onPick(deck)}
      aria-label={`Nivel ${deck.level}, ${deck.name}${current ? ' (en curso)' : ''}`}
      aria-describedby={details}
      aria-keyshortcuts={shortcut ?? undefined}
      className={cn(
        cardBase,
        'flex h-full flex-col bg-surface p-5 shadow-card hover:border-accent/40 hover:shadow-key-hover',
        current ? 'border-accent/45' : 'border-line',
      )}
    >
      <span className="flex w-full items-start gap-3.5 pr-8">
        {/* La ficha crece con el número: los niveles 10 a 17 tienen dos cifras. */}
        <span
          aria-hidden
          className="grid h-12 min-w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft px-2 font-display text-2xl text-accent tabular-nums transition-colors group-hover:bg-brand group-hover:text-accent-ink"
        >
          {deck.level}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[17px] font-semibold">{deck.name}</span>
            {current && (
              <Badge tone="accent-soft" caps>
                En curso
              </Badge>
            )}
            <DueBadge count={summary.due} />
          </span>
          <span className="block text-xs text-muted tabular-nums">
            Palabras {deck.from.toLocaleString('es')}–{deck.to.toLocaleString('es')}
          </span>
        </span>
      </span>
      <span id={details} className="flex min-w-0 flex-1 flex-col">
        <span className="mt-3 block text-sm leading-snug text-muted">{deck.description}</span>
        <span lang="en" className="mt-3 block truncate text-[15px] font-medium text-ink/75">
          {samplePreview(deck)
            .map((w) => w.en)
            .join(' · ')}
        </span>
        <span className="mt-auto pt-4">
          <ProgressBar summary={summary} />
          <span className="mt-1.5 block text-[11px] text-muted tabular-nums">
            {started
              ? `${summary.mastered} dominadas · ${summary.learning} aprendiendo`
              : `${summary.total} palabras por descubrir`}
          </span>
        </span>
      </span>
      {shortcut && <Kbd className="absolute top-4 right-4">{shortcut}</Kbd>}
    </button>
  )
}

function AllWordsCard({ summary, onPick }: { summary: DeckSummary; onPick: (deck: Deck) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(ALL_DECK)}
      aria-keyshortcuts="0"
      className={cn(
        cardBase,
        'flex items-center gap-4 border-accent/25 bg-accent-soft p-5 hover:border-accent/50 hover:shadow-key-hover',
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-accent-ink shadow-glow">
        <ShuffleIcon width={18} height={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[17px] font-semibold">{ALL_DECK.name}</span>
          <DueBadge count={summary.due} />
        </span>
        <span className="block text-sm text-muted">
          Las {summary.total.toLocaleString('es')}, {ALL_DECK.description.toLowerCase()}
        </span>
      </span>
      <Kbd>0</Kbd>
    </button>
  )
}
