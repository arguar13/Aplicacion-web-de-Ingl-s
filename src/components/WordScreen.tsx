import { cn } from '@/lib/cn'
import type { PickReason } from '@/lib/scheduler'
import type { Word } from '@/lib/types'
import { SpeakerIcon } from './icons'

interface Props {
  word: Word
  reason: PickReason
  solved: boolean
  mistakes: number
  onReplay: () => void
}

const REASON_BADGE: Partial<Record<PickReason, { label: string; tone: string }>> = {
  new: { label: 'Nueva', tone: 'bg-accent-soft text-accent' },
  review: { label: 'Repaso', tone: 'bg-ok-soft text-ok' },
  relearn: { label: 'Otra vez', tone: 'bg-bad-soft text-bad' },
}

/** Tamaño de letra según la longitud, para que "straightforward" quepa en un móvil. */
function sizeFor(text: string): string {
  if (text.length <= 7) return 'text-7xl sm:text-8xl md:text-9xl short:text-7xl'
  if (text.length <= 11) return 'text-6xl sm:text-7xl md:text-8xl short:text-6xl'
  return 'text-[2.75rem] sm:text-6xl md:text-7xl short:text-5xl'
}

export function WordScreen({ word, reason, solved, mistakes, onReplay }: Props) {
  const badge = REASON_BADGE[reason]
  const status = solved
    ? { text: mistakes === 0 ? '¡Correcto!' : 'Eso es.', tone: 'text-ok' }
    : mistakes > 0
      ? { text: 'No es esa. Prueba otra.', tone: 'text-bad' }
      : { text: 'Elige su traducción', tone: 'text-muted' }

  return (
    <section className="rounded-[28px] border border-line bg-surface px-5 pt-4 pb-6 md:px-8 md:pb-8 short:pb-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_40px_-20px_rgb(0_0_0/0.18)] sm:px-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Inglés</span>
          {badge && (
            <span
              key={word.id}
              className={cn('animate-rise rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase', badge.tone)}
            >
              {badge.label}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReplay}
          aria-label="Escuchar de nuevo"
          title="Escuchar de nuevo (Espacio)"
          className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <SpeakerIcon />
        </button>
      </div>

      <p
        key={word.id}
        lang="en"
        className={cn('mt-3 md:mt-5 short:mt-2 animate-rise text-center font-display leading-none break-words', sizeFor(word.en))}
      >
        {word.en}
      </p>

      <p aria-live="polite" className={cn('mt-6 h-5 text-center text-sm font-medium transition-colors', status.tone)}>
        {status.text}
      </p>
    </section>
  )
}
