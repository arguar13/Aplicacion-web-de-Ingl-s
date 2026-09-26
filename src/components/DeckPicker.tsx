import { useKeyDown } from '@/hooks/useKeyDown'
import { cn } from '@/lib/cn'
import { ALL_DECK, type Deck, LEVELS, samplePreview } from '@/lib/decks'
import { ShuffleIcon } from './icons'
import { Kbd } from './Kbd'

/** Tecla para elegir cada mazo: 1–9 para los niveles, 0 para todas las palabras. */
const shortcutOf = (deck: Deck) => (deck.level === null ? '0' : deck.level <= 9 ? String(deck.level) : null)

export function DeckPicker({ onPick }: { onPick: (deck: Deck) => void }) {
  useKeyDown((event) => {
    const deck = [...LEVELS, ALL_DECK].find((d) => shortcutOf(d) === event.key)
    if (deck) onPick(deck)
  })

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="animate-rise text-center">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Vocabulario en inglés</p>
        <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-6xl">
          Escucha, <em className="text-accent">piensa</em>, pulsa.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted">
          {ALL_DECK.words.length.toLocaleString('es')} palabras ordenadas por lo mucho que se usan. Empieza por las más
          útiles y sube de nivel.
        </p>
      </div>

      <ul className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4">
        {LEVELS.map((deck, index) => (
          <li key={deck.id} className="animate-rise" style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}>
            <LevelCard deck={deck} onPick={onPick} />
          </li>
        ))}
        <li
          className="animate-rise sm:col-span-2"
          style={{ animationDelay: `${LEVELS.length * 40}ms`, animationFillMode: 'both' }}
        >
          <AllWordsCard onPick={onPick} />
        </li>
      </ul>
    </main>
  )
}

const cardBase = cn(
  'group relative w-full cursor-pointer rounded-2xl border text-left',
  'transition-[translate,box-shadow,border-color] duration-150',
  'hover:-translate-y-0.5 active:translate-y-1 active:shadow-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
)

function LevelCard({ deck, onPick }: { deck: Deck; onPick: (deck: Deck) => void }) {
  const shortcut = shortcutOf(deck)
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
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">{deck.name}</span>
        <span className="block text-xs text-muted tabular-nums">
          Palabras {deck.from.toLocaleString('es')}–{deck.to.toLocaleString('es')}
        </span>
        <span className="mt-2 hidden text-sm leading-snug text-muted sm:block">{deck.description}</span>
        <span lang="en" className="mt-2 block truncate sm:mt-3 font-display text-lg text-ink/75 italic">
          {samplePreview(deck)
            .map((w) => w.en)
            .join(' · ')}
        </span>
      </span>
      {shortcut && <Kbd className="absolute top-4 right-4 hidden pointer-fine:inline-flex">{shortcut}</Kbd>}
    </button>
  )
}

function AllWordsCard({ onPick }: { onPick: (deck: Deck) => void }) {
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
        <span className="block text-[17px] font-semibold">{ALL_DECK.name}</span>
        <span className="block text-sm text-muted">
          Las {ALL_DECK.words.length.toLocaleString('es')}, {ALL_DECK.description.toLowerCase()}
        </span>
      </span>
      <Kbd className="hidden pointer-fine:inline-flex">0</Kbd>
    </button>
  )
}
