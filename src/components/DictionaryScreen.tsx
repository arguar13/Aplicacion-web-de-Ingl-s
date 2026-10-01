import { useDeferredValue, useId, useMemo, useRef, useState } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { useWindowVirtualizer } from '@/hooks/useWindowVirtualizer'
import { cn } from '@/lib/cn'
import { LEVELS } from '@/lib/decks'
import { loadDetails, POS_LABEL } from '@/lib/details'
import { type DictionaryFilters, searchWords, type StatusFilter } from '@/lib/dictionary'
import { saveTextFile } from '@/lib/download'
import { csvFileName, exportWordsCsv } from '@/lib/exportCsv'
import { plural } from '@/lib/format'
import { cardKey, dayKey, useProgress } from '@/lib/progress'
import { statusOf } from '@/lib/scheduler'
import { useSettings } from '@/lib/settings'
import { isHard } from '@/lib/smartDecks'
import { PARTS_OF_SPEECH, trackOf, type Word } from '@/lib/types'
import { Header } from './Header'
import { ArrowLeftIcon, ExportIcon, StarIcon } from './icons'
import { Button } from './ui/Button'
import { Select } from './ui/controls'

const ROW_HEIGHT = 64

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Nuevas' },
  { value: 'learning', label: 'Aprendiendo' },
  { value: 'mastered', label: 'Dominadas' },
  { value: 'hard', label: 'Difíciles' },
  { value: 'favorite', label: 'Favoritas' },
]

const TRACK_NAME = { 'en-es': 'traducir', 'es-en': 'inverso', listen: 'escuchar', type: 'escribir' } as const

/** Diccionario personal: todo el vocabulario con búsqueda instantánea y filtros. */
export function DictionaryScreen({ onExit, onOpenWord }: { onExit: () => void; onOpenWord: (id: string) => void }) {
  const progress = useProgress()
  const { mode } = useSettings()
  const track = trackOf(mode)
  const [filters, setFilters] = useState<DictionaryFilters>({ query: '', status: 'all', level: null, pos: null })
  // La lista se filtra con la búsqueda diferida: el campo responde al instante aunque se escriba rápido.
  const deferred = useDeferredValue(filters)
  const results = useMemo(() => searchWords(deferred, progress, track), [deferred, progress, track])
  const list = useRef<HTMLUListElement>(null)
  const range = useWindowVirtualizer(list, results.length, ROW_HEIGHT)
  const favorites = useMemo(() => new Set(progress.favorites), [progress.favorites])
  const statusName = useId()

  useKeyDown((event) => {
    if (event.key === 'Escape') onExit()
  })

  const update = (patch: Partial<DictionaryFilters>) => setFilters((current) => ({ ...current, ...patch }))

  /** Descarga la lista que se ve (con los filtros de ahora) como CSV, con IPA y ejemplos si ya cargaron. */
  async function exportCsv() {
    // Sin conexión y sin caché puede fallar: se exporta igual, sin esas columnas.
    const details = await loadDetails().catch(() => null)
    saveTextFile(csvFileName(dayKey(Date.now())), exportWordsCsv(results, details, progress, track), 'text/csv')
  }

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
        <h1 className="mt-4 font-display text-5xl leading-none">Diccionario</h1>

        {/* Búsqueda y filtros fijos arriba mientras se recorre la lista. */}
        <div className="sticky top-0 z-10 -mx-4 mt-6 bg-bg/90 px-4 pt-3 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <label className="sr-only" htmlFor="dictionary-search">
            Buscar en inglés o en español
          </label>
          <input
            id="dictionary-search"
            type="search"
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="Buscar en inglés o en español…"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-2xl border border-line-strong bg-raised px-4 text-[16px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
          {/* min-w-0: un fieldset mide por defecto lo que su contenido; sin él no se desplazaría y ensancharía la página. */}
          <fieldset className="-mx-1 mt-3 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1">
            <legend className="sr-only">Estado</legend>
            {STATUS_FILTERS.map((option) => (
              <label
                key={option.value}
                className="relative shrink-0 cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink has-checked:border-accent has-checked:bg-accent has-checked:text-accent-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name={statusName}
                  value={option.value}
                  checked={filters.status === option.value}
                  onChange={() => update({ status: option.value })}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <div className="mt-2 flex gap-2">
            <Select
              label="Nivel"
              value={filters.level === null ? '' : String(filters.level)}
              onChange={(value) => update({ level: value ? Number(value) : null })}
              options={[
                { value: '', label: 'Todos los niveles' },
                ...LEVELS.map((deck) => ({ value: String(deck.level), label: `Nivel ${deck.level} · ${deck.name}` })),
              ]}
            />
            <Select
              label="Categoría"
              value={filters.pos ?? ''}
              onChange={(value) => update({ pos: PARTS_OF_SPEECH.find((pos) => pos === value) ?? null })}
              options={[
                { value: '', label: 'Todas las categorías' },
                ...PARTS_OF_SPEECH.map((pos) => ({ value: pos, label: capitalize(POS_LABEL[pos]) })),
              ]}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-xs text-muted">
            {plural(results.length, 'palabra')}
            {filters.status !== 'all' &&
              filters.status !== 'favorite' &&
              ` · según tu progreso en ${TRACK_NAME[track]}`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void exportCsv()}
            disabled={results.length === 0}
            title="Descarga esta lista como CSV, para una hoja de cálculo o Anki"
            className="-mr-3"
          >
            <ExportIcon width={16} height={16} />
            Exportar CSV
          </Button>
        </div>

        {results.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-muted">
            {filters.status === 'favorite' && !filters.query
              ? 'Aún no tienes favoritas: márcalas con la estrella en la ficha de cada palabra.'
              : 'No hay palabras que coincidan.'}
          </p>
        ) : (
          <ul
            ref={list}
            aria-label="Palabras"
            className="relative mt-2"
            style={{ height: results.length * ROW_HEIGHT }}
          >
            {results.slice(range.start, range.end).map((word, i) => {
              const index = range.start + i
              return (
                <li
                  key={word.id}
                  className="absolute inset-x-0"
                  style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  <WordRow
                    word={word}
                    favorite={favorites.has(word.id)}
                    status={rowStatus(progress.cards[cardKey(track, word.id)])}
                    onOpen={() => onOpenWord(word.id)}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </>
  )
}

type RowStatus = 'new' | 'learning' | 'mastered' | 'hard'

const STATUS_DOT: Record<RowStatus, { className: string; label: string }> = {
  new: { className: 'bg-line-strong', label: 'Nueva' },
  learning: { className: 'bg-accent/40', label: 'Aprendiendo' },
  mastered: { className: 'bg-accent', label: 'Dominada' },
  hard: { className: 'bg-bad', label: 'Difícil' },
}

function rowStatus(card: Parameters<typeof statusOf>[0]): RowStatus {
  if (card && isHard(card)) return 'hard'
  return statusOf(card)
}

function WordRow({
  word,
  favorite,
  status,
  onOpen,
}: {
  word: Word
  favorite: boolean
  status: RowStatus
  onOpen: () => void
}) {
  const dot = STATUS_DOT[status]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full cursor-pointer items-center gap-3 border-b border-line px-2 text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', dot.className)} />
      <span className="sr-only">{dot.label}:</span>
      <span className="min-w-0 flex-1">
        <span lang="en" className="block truncate text-[17px] font-medium">
          {word.en}
          {favorite && (
            <StarIcon
              aria-label="Favorita"
              filled
              width={14}
              height={14}
              className="ml-1.5 inline align-[-1px] text-accent"
            />
          )}
        </span>
        <span className="block text-[11px] text-muted">{POS_LABEL[word.pos]}</span>
      </span>
      <span lang="es" className="max-w-[45%] truncate text-right text-[15px] text-muted">
        {word.es}
      </span>
    </button>
  )
}
