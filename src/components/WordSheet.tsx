import { useState } from 'react'
import { useNow } from '@/hooks/useNow'
import { playPronunciation } from '@/lib/audio'
import { ALL_WORDS } from '@/lib/decks'
import { formsText, POS_LABEL, splitAround, useWordDetails } from '@/lib/details'
import { type EventResult, useEvents } from '@/lib/events'
import { plural, relativeDay } from '@/lib/format'
import { cardLookup, markKnown, restoreCard, toggleFavorite, useProgress } from '@/lib/progress'
import { type CardState, isMastered, statusOf } from '@/lib/scheduler'
import { useSettings } from '@/lib/settings'
import { type Track, trackOf, TRACKS, type Word } from '@/lib/types'
import { SlowIcon, SpeakerIcon, StarIcon } from './icons'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { Sheet } from './ui/Sheet'

const WORDS = new Map(ALL_WORDS.map((word) => [word.id, word]))

const TRACK_LABEL: Record<Track, string> = {
  'en-es': 'Traducir',
  'es-en': 'Inverso',
  listen: 'Escuchar',
  type: 'Escribir',
}

const RESULT: Record<EventResult, { mark: string; label: string; tone: string }> = {
  clean: { mark: '✓', label: 'a la primera', tone: 'text-ok' },
  almost: { mark: '≈', label: 'casi', tone: 'text-ok' },
  miss: { mark: '✗', label: 'con fallos', tone: 'text-bad' },
}

const HISTORY_SHOWN = 8

/** Ficha de una palabra, como panel sobre la pantalla actual (`?palabra=<id>`). */
export function WordSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const word = id ? WORDS.get(id) : undefined
  return (
    <Sheet open={word !== undefined} onClose={onClose} title={word?.en ?? ''} titleLang="en">
      {word && <WordSheetContent key={word.id} word={word} />}
    </Sheet>
  )
}

function WordSheetContent({ word }: { word: Word }) {
  const progress = useProgress()
  const events = useEvents()
  const { mode } = useSettings()
  const details = useWordDetails(word.id)
  const track = trackOf(mode)
  const [undo, setUndo] = useState<{ previous: CardState | undefined } | null>(null)
  const favorite = progress.favorites.includes(word.id)
  const current = cardLookup(progress, track)(word.id)
  const forms = details && formsText(details)
  const example = details?.example
  const parts = example && splitAround(example.en, word.en)
  const history = events
    .filter((e) => e.id === word.id)
    .slice(-HISTORY_SHOWN)
    .toReversed()
  const now = useNow()

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1">
        {details?.ipa && <span className="mr-1 text-[15px] text-muted">{details.ipa}</span>}
        <IconButton label="Escuchar" hover="accent" onClick={() => void playPronunciation(word.id)}>
          <SpeakerIcon width={18} height={18} />
        </IconButton>
        <IconButton
          label="Escuchar despacio"
          hover="accent"
          onClick={() => void playPronunciation(word.id, { slow: true })}
        >
          <SlowIcon width={18} height={18} />
        </IconButton>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="accent-soft" caps>
          {POS_LABEL[word.pos]}
        </Badge>
        <span lang="es" className="text-lg font-semibold">
          {word.es}
        </span>
      </p>
      {forms && <p className="mt-1 text-[13px] text-muted">{forms}</p>}

      {example && (
        <figure className="mt-4 border-l-2 border-accent/60 pl-4">
          <blockquote lang="en" className="text-lg leading-snug font-medium tracking-[-0.01em]">
            {parts ? (
              <>
                {parts[0]}
                <mark className="rounded-md bg-accent-soft px-1 text-accent">{parts[1]}</mark>
                {parts[2]}
              </>
            ) : (
              example.en
            )}
          </blockquote>
          <figcaption lang="es" className="mt-1 text-sm text-muted">
            {example.es}
          </figcaption>
        </figure>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant={favorite ? 'primary' : 'secondary'}
          aria-pressed={favorite}
          onClick={() => toggleFavorite(word.id)}
        >
          <StarIcon width={16} height={16} filled={favorite} />
          {favorite ? 'Favorita' : 'Marcar favorita'}
        </Button>
        {undo ? (
          <Button
            variant="ghost"
            onClick={() => {
              restoreCard(track, word.id, undo.previous)
              setUndo(null)
            }}
          >
            Deshacer «ya la sé»
          </Button>
        ) : (
          <Button
            disabled={current !== undefined && isMastered(current)}
            onClick={() => setUndo({ previous: markKnown(track, word.id) })}
          >
            {current && isMastered(current) ? `Dominada en ${TRACK_LABEL[track]}` : 'Ya la sé'}
          </Button>
        )}
      </div>

      <h3 className="mt-6 text-[11px] font-medium tracking-[0.18em] text-muted uppercase">Tu progreso</h3>
      <dl className="mt-2 divide-y divide-line rounded-2xl border border-line">
        {TRACKS.map((t) => {
          const card = cardLookup(progress, t)(word.id)
          return (
            <div key={t} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <dt className={t === track ? 'font-semibold' : 'text-muted'}>{TRACK_LABEL[t]}</dt>
              <dd className="text-right">{describeCard(card, now)}</dd>
            </div>
          )
        })}
      </dl>

      {history.length > 0 && (
        <>
          <h3 className="mt-6 text-[11px] font-medium tracking-[0.18em] text-muted uppercase">Últimas respuestas</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {history.map((event) => (
              <li key={`${event.t}-${event.track}`} className="flex items-center gap-2.5">
                <span aria-hidden className={`w-4 text-center font-semibold ${RESULT[event.r].tone}`}>
                  {RESULT[event.r].mark}
                </span>
                <span>
                  {TRACK_LABEL[event.track]}, {RESULT[event.r].label}
                </span>
                <span className="ml-auto text-xs text-muted">
                  {relativeDay(event.t, now)} · {(event.ms / 1000).toLocaleString('es', { maximumFractionDigits: 1 })} s
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function describeCard(card: CardState | undefined, now: number): string {
  if (!card) return 'Nueva'
  const status = statusOf(card) === 'mastered' ? 'Dominada' : 'Aprendiendo'
  if (card.due <= now) return `${status} · repaso pendiente`
  const days = Math.round((card.due - now) / 86_400_000)
  return `${status} · repaso ${days < 1 ? 'hoy' : `en ${plural(days, 'día')}`}`
}
