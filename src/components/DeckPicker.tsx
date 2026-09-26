import { useKeyDown } from '@/hooks/useKeyDown'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'
import { ALL_DECK, type Deck, LEVELS, samplePreview } from '@/lib/decks'
import { cardLookup, dailyStreak, useProgress } from '@/lib/progress'
import { type DeckSummary, summarize } from '@/lib/scheduler'
import { updateSettings, useSettings } from '@/lib/settings'
import type { Direction } from '@/lib/types'
import { IconButton, Segmented } from './controls'
import { Header, Stat } from './Header'
import { ArrowRightIcon, SettingsIcon, ShuffleIcon } from './icons'
import { Kbd } from './Kbd'
import { ProgressBar } from './ProgressBar'

const DIRECTIONS: Array<{ value: Direction; label: string }> = [
  { value: 'en-es', label: 'Inglés → Español' },
  { value: 'es-en', label: 'Español → Inglés' },
]
const DECKS = [...LEVELS, ALL_DECK]

/** Tecla para elegir cada mazo: 1–9 para los niveles, 0 para todas las palabras. */
const shortcutOf = (deck: Deck) => (deck.level === null ? '0' : deck.level <= 9 ? String(deck.level) : null)

interface Props {
  onPick: (deck: Deck) => void
  onOpenSettings: () => void
}

export function DeckPicker({ onPick, onOpenSettings }: Props) {
  const progress = useProgress()
  const { direction } = useSettings()
  const now = useNow()
  const lookup = cardLookup(progress, direction)
  const summaries = new Map(DECKS.map((deck) => [deck.id, summarize(deck.words, lookup, now)]))
  const total = summaries.get(ALL_DECK.id)!
  const suggested = DECKS.find((d) => d.id === progress.lastDeckId) ?? LEVELS[0]
  const hasProgress = total.fresh < total.total
  const anyProgress = Object.keys(progress.cards).length > 0

  useKeyDown((event) => {
    if (event.key === 'Enter') return onPick(suggested)
    const deck = DECKS.find((d) => shortcutOf(d) === event.key)
    if (deck) onPick(deck)
  })

  return (
    <>
      <Header
        action={
          <IconButton label="Ajustes" onClick={onOpenSettings} className="-mr-2">
            <SettingsIcon />
          </IconButton>
        }
      >
        {anyProgress && (
          <>
            <Stat label="Días" value={dailyStreak(progress.days, now)} />
            <Stat label="Dominadas" value={total.mastered.toLocaleString('es')} />
            <Stat label="Récord" value={progress.bestStreak} />
          </>
        )}
      </Header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="animate-rise text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Vocabulario en inglés</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-6xl">
            Escucha, <em className="text-accent">piensa</em>, pulsa.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            {total.total.toLocaleString('es')} palabras ordenadas por lo mucho que se usan. Lo que falles volverá justo
            antes de que lo olvides.
          </p>
          <Segmented
            label="Sentido de las preguntas"
            value={direction}
            options={DIRECTIONS}
            onChange={(value) => updateSettings({ direction: value })}
            className="mt-7"
          />
        </div>

        <ContinueCard
          deck={suggested}
          summary={summaries.get(suggested.id)!}
          resuming={hasProgress}
          onPick={onPick}
        />

        <h2 className="mt-12 mb-4 text-[11px] font-medium tracking-[0.2em] text-muted uppercase sm:mt-14">
          Todos los niveles
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {LEVELS.map((deck, index) => (
            <li key={deck.id} className="animate-rise" style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}>
              <LevelCard deck={deck} summary={summaries.get(deck.id)!} onPick={onPick} />
            </li>
          ))}
          <li
            className="animate-rise sm:col-span-2"
            style={{ animationDelay: `${LEVELS.length * 40}ms`, animationFillMode: 'both' }}
          >
            <AllWordsCard summary={total} onPick={onPick} />
          </li>
        </ul>
      </main>
    </>
  )
}

const cardBase = cn(
  'group relative w-full cursor-pointer rounded-2xl border text-left',
  'transition-[translate,box-shadow,border-color] duration-150',
  'hover:-translate-y-0.5 active:translate-y-1 active:shadow-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
)

function DueBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-ink tabular-nums">
      {count.toLocaleString('es')} por repasar
    </span>
  )
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
      aria-keyshortcuts="Enter"
      className={cn(
        cardBase,
        'animate-rise mt-9 flex items-center gap-4 border-accent bg-accent p-5 text-accent-ink sm:mt-10 sm:gap-5 sm:p-6',
        'shadow-[0_4px_0_0_color-mix(in_oklab,var(--accent)_65%,black),0_18px_40px_-16px_var(--accent)]',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-[0.18em] uppercase opacity-75">
          {resuming ? 'Continuar' : 'Empieza aquí'}
        </span>
        <span className="mt-1 block font-display text-3xl leading-tight sm:text-4xl">{deckLabel(deck)}</span>
        <span className="mt-1 block text-sm opacity-80">{detail}</span>
        {resuming && (
          <span className="mt-4 flex items-center gap-3">
            <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-accent-ink/20">
              <span className="bg-accent-ink" style={{ width: `${(summary.mastered / summary.total) * 100}%` }} />
              <span className="bg-accent-ink/45" style={{ width: `${(summary.learning / summary.total) * 100}%` }} />
            </span>
            <span className="text-xs font-medium tabular-nums opacity-80">
              {Math.round((summary.mastered / summary.total) * 100)}%
            </span>
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-center gap-2">
        <span className="grid size-12 place-items-center rounded-full bg-accent-ink text-accent transition-transform group-hover:translate-x-0.5">
          <ArrowRightIcon />
        </span>
        <Kbd className="hidden border-accent-ink/25 bg-accent-ink/10 text-accent-ink pointer-fine:inline-flex">Enter</Kbd>
      </span>
    </button>
  )
}

function LevelCard({ deck, summary, onPick }: { deck: Deck; summary: DeckSummary; onPick: (deck: Deck) => void }) {
  const shortcut = shortcutOf(deck)
  const started = summary.fresh < summary.total
  return (
    <button
      type="button"
      onClick={() => onPick(deck)}
      aria-keyshortcuts={shortcut ?? undefined}
      className={cn(
        cardBase,
        'flex h-full gap-4 border-line bg-surface p-5 shadow-[0_4px_0_0_var(--line)]',
        'hover:border-accent/40 hover:shadow-[0_6px_0_0_color-mix(in_oklab,var(--accent)_30%,var(--line))]',
      )}
    >
      <span className="w-9 shrink-0 font-display text-5xl leading-[0.9] text-accent tabular-nums">{deck.level}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-8">
          <span className="text-[17px] font-semibold">{deck.name}</span>
          <DueBadge count={summary.due} />
        </span>
        <span className="block text-xs text-muted tabular-nums">
          Palabras {deck.from.toLocaleString('es')}–{deck.to.toLocaleString('es')}
        </span>
        <span className="mt-2 hidden text-sm leading-snug text-muted sm:block">{deck.description}</span>
        <span lang="en" className="mt-2 block truncate font-display text-lg text-ink/75 italic sm:mt-3">
          {samplePreview(deck)
            .map((w) => w.en)
            .join(' · ')}
        </span>
        <span className="mt-auto pt-3">
          <ProgressBar summary={summary} />
          <span className="mt-1.5 block text-[11px] text-muted tabular-nums">
            {started
              ? `${summary.mastered} dominadas · ${summary.learning} aprendiendo`
              : `${summary.total} palabras por descubrir`}
          </span>
        </span>
      </span>
      {shortcut && <Kbd className="absolute top-4 right-4 hidden pointer-fine:inline-flex">{shortcut}</Kbd>}
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
        'flex items-center gap-4 border-accent/25 bg-accent-soft p-5',
        'shadow-[0_4px_0_0_color-mix(in_oklab,var(--accent)_25%,transparent)] hover:border-accent/50',
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
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
      <Kbd className="hidden pointer-fine:inline-flex">0</Kbd>
    </button>
  )
}
