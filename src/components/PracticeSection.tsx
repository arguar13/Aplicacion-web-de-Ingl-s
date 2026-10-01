import { useId, useState } from 'react'
import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { cn } from '@/lib/cn'
import { ALL_DECK, type Deck, LEVELS, samplePreview } from '@/lib/decks'
import type { DeckSummary } from '@/lib/scheduler'
import { updateSettings } from '@/lib/settings'
import { type Mode, trackOf } from '@/lib/types'
import { cardBase, shortcutOf } from './homeCards'
import { ArrowRightIcon, ShuffleIcon } from './icons'
import { ModePicker } from './ModePicker'
import { ProgressBar } from './ProgressBar'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'

/** Niveles que se ven de entrada en el inicio. */
const LEVELS_SHOWN = 6

/**
 * «Practica por tu cuenta»: cómo practicar (el modo), el nivel en curso y todos los niveles. Va al
 * final del inicio y se carga aparte (no hace falta para el primer pintado).
 */
export function PracticeSection({
  mode,
  suggested,
  resuming,
  onPick,
}: {
  mode: Mode
  suggested: Deck
  resuming: boolean
  onPick: (deck: Deck) => void
}) {
  const summaryOf = useDeckSummaries(trackOf(mode))
  const total = summaryOf(ALL_DECK)
  // Los primeros niveles y el que se está practicando; el resto, a un toque (son 17).
  const [showAllLevels, setShowAllLevels] = useState(false)
  const levelsId = useId()
  const visibleLevels = showAllLevels
    ? LEVELS
    : LEVELS.filter((deck, index) => index < LEVELS_SHOWN || deck.id === suggested.id)

  return (
    <>
      <section aria-labelledby="por-tu-cuenta" className="mt-14 sm:mt-16">
        <h2 id="por-tu-cuenta" className="font-display text-3xl">
          Practica por tu cuenta
        </h2>
        <p className="mt-1 text-sm text-muted">Elige cómo practicar y por dónde: un nivel o todas las palabras.</p>
        <ModePicker value={mode} onChange={(next) => updateSettings({ mode: next })} className="mt-6" wide />
        <ContinueCard deck={suggested} summary={summaryOf(suggested)} resuming={resuming} onPick={onPick} />
      </section>

      <h2 className="mt-12 mb-4 text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">Todos los niveles</h2>
      <ul id={levelsId} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {visibleLevels.map((deck, index) => (
          <li
            key={deck.id}
            className="animate-rise"
            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
          >
            <LevelCard deck={deck} summary={summaryOf(deck)} onPick={onPick} />
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

function DueBadge({ count }: { count: number }) {
  if (count === 0) return null
  return <Badge tone="accent">{count.toLocaleString('es')} por repasar</Badge>
}

function deckLabel(deck: Deck) {
  return deck.level === null ? deck.name : `Nivel ${deck.level} · ${deck.name}`
}

function ContinueCard({
  deck,
  summary,
  resuming,
  onPick,
}: {
  deck: Deck
  summary: DeckSummary
  resuming: boolean
  onPick: (deck: Deck) => void
}) {
  const detail = !resuming
    ? `Tus primeras ${summary.total} palabras, las más usadas del inglés.`
    : summary.due > 0
      ? `${summary.due.toLocaleString('es')} palabras esperan repaso.`
      : summary.fresh > 0
        ? `${summary.fresh.toLocaleString('es')} palabras nuevas por descubrir.`
        : 'Todo al día. Practica para afianzar.'

  return (
    <button
      type="button"
      onClick={() => onPick(deck)}
      className={cn(
        cardBase,
        'mt-5 flex items-center gap-4 border-line bg-surface p-5 shadow-card sm:gap-5 sm:p-6',
        'hover:border-accent/40 hover:shadow-key-hover',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
          {resuming ? 'Continuar' : 'Empieza por un nivel'}
        </span>
        <span className="mt-1 block font-display text-2xl leading-tight">{deckLabel(deck)}</span>
        <span className="mt-0.5 block text-sm text-muted">{detail}</span>
        {resuming && (
          <span className="mt-3 flex max-w-xl items-center gap-3">
            <ProgressBar summary={summary} className="flex-1" />
            <span className="text-xs font-medium text-muted tabular-nums">
              {Math.round((summary.mastered / summary.total) * 100)}%
            </span>
          </span>
        )}
      </span>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-accent-ink shadow-glow transition-transform group-hover:translate-x-1">
        <ArrowRightIcon />
      </span>
    </button>
  )
}

function LevelCard({ deck, summary, onPick }: { deck: Deck; summary: DeckSummary; onPick: (deck: Deck) => void }) {
  const shortcut = shortcutOf(deck)
  const started = summary.fresh < summary.total
  const details = useId()
  return (
    // Nombre corto y preciso ("Nivel 13, Erudito"); el resto de la tarjeta queda como descripción.
    // Sin esto, el nombre sería todo su texto ("…sin diccionario") y chocaría con otros botones.
    <button
      type="button"
      onClick={() => onPick(deck)}
      aria-label={`Nivel ${deck.level}, ${deck.name}`}
      aria-describedby={details}
      aria-keyshortcuts={shortcut ?? undefined}
      className={cn(
        cardBase,
        'flex h-full flex-col border-line bg-surface p-5 shadow-card',
        'hover:border-accent/40 hover:shadow-key-hover',
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
