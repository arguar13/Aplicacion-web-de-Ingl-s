import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { POS_LABEL } from '@/lib/details'
import { formatInterval } from '@/lib/format'
import type { SelfRating } from '@/lib/scheduler'
import { SELF_RATINGS } from '@/lib/scheduler'
import type { Word } from '@/lib/types'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'
import { Surface } from './ui/Surface'

interface Props {
  word: Word
  /** La traducción ya está a la vista. */
  revealed: boolean
  /** La nota elegida (la ronda está resuelta). */
  rating: SelfRating | null
  /** Cuánto se alejaría la palabra con cada nota (ms). */
  intervals: Record<SelfRating, number>
  onReveal: () => void
  onRate: (rating: SelfRating) => void
}

const RATING_INFO: Record<SelfRating, { label: string; idle: string; chosen: string }> = {
  again: {
    label: 'Otra vez',
    idle: 'hover:border-bad/40 hover:text-bad',
    chosen: 'border-bad/40 bg-bad-soft text-bad',
  },
  hard: {
    label: 'Difícil',
    idle: 'hover:border-accent/40 hover:text-accent',
    chosen: 'border-accent bg-accent-soft text-accent',
  },
  good: {
    label: 'Bien',
    idle: 'hover:border-ok/40 hover:text-ok',
    chosen: 'animate-pop border-ok bg-ok text-ok-ink',
  },
  easy: {
    label: 'Fácil',
    idle: 'hover:border-ok/40 hover:text-ok',
    chosen: 'animate-pop border-ok bg-ok text-ok-ink',
  },
}

/**
 * Modo tarjetas: se piensa la traducción, se muestra y uno mismo se califica con las cuatro notas
 * del repaso espaciado. Cada nota dice cuándo volvería la palabra, para elegir con criterio.
 */
export function FlashCard({ word, revealed, rating, intervals, onReveal, onRate }: Props) {
  const reveal = useRef<HTMLButtonElement>(null)
  // Con teclado o lector de pantalla, el siguiente paso siempre está a mano.
  useEffect(() => {
    if (!revealed) reveal.current?.focus({ preventScroll: true })
  }, [revealed])

  if (!revealed) {
    return (
      <Surface className="flex min-h-40 flex-col items-center justify-center gap-3 px-5 py-6 text-center sm:min-h-48">
        <p className="text-sm text-muted">¿Sabes qué significa? Piénsalo y comprueba.</p>
        <Button ref={reveal} variant="primary" size="lg" onClick={onReveal} aria-keyshortcuts="Enter">
          Mostrar la traducción
          <Kbd tone="accent">Enter</Kbd>
        </Button>
      </Surface>
    )
  }

  return (
    <Surface as="section" aria-label="Califícate" className="animate-rise px-5 pt-5 pb-4 sm:px-6">
      <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center">
        <Badge tone="accent-soft" caps>
          {POS_LABEL[word.pos]}
        </Badge>
        <span lang="es" className="font-display text-3xl leading-tight sm:text-4xl">
          {word.es}
        </span>
      </p>
      <div role="group" aria-label="Qué tal te salió" className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
        {SELF_RATINGS.map((option, index) => {
          const info = RATING_INFO[option]
          const chosen = rating === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onRate(option)}
              disabled={rating !== null}
              aria-keyshortcuts={String(index + 1)}
              className={cn(
                'relative flex min-h-16 flex-col items-center justify-center rounded-2xl border px-1 pt-2 pb-1.5 text-sm font-semibold select-none sm:min-h-20',
                'transition-[translate,scale,box-shadow,background-color,border-color,color,opacity] duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                rating === null
                  ? cn('cursor-pointer border-line bg-surface text-ink shadow-key active:scale-[0.98]', info.idle)
                  : chosen
                    ? info.chosen
                    : 'border-line bg-surface text-muted opacity-40',
              )}
            >
              {/* El atajo, como los demás: solo con puntero fino, y no en celdas estrechas donde taparía el texto. */}
              <span aria-hidden className="absolute top-1.5 left-2 hidden text-[10px] opacity-60 sm:pointer-fine:block">
                {index + 1}
              </span>
              {info.label}
              <span className={cn('mt-0.5 text-[11px] font-medium tabular-nums', !chosen && 'text-muted')}>
                {formatInterval(intervals[option])}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-muted">
        Debajo de cada nota, cuándo volvería la palabra. «Otra vez» si no la sabías.
      </p>
    </Surface>
  )
}
