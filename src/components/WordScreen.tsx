import { cn } from '@/lib/cn'
import type { PickReason } from '@/lib/scheduler'
import type { Direction, Word } from '@/lib/types'
import { SpeakerIcon } from './icons'
import { Badge, type BadgeTone } from './ui/Badge'
import { IconButton } from './ui/IconButton'
import { Surface } from './ui/Surface'

interface Props {
  word: Word
  direction: Direction
  reason: PickReason
  solved: boolean
  mistakes: number
  canReplay: boolean
  onReplay: () => void
}

const REASON_BADGE: Partial<Record<PickReason, { label: string; tone: BadgeTone }>> = {
  new: { label: 'Nueva', tone: 'accent-soft' },
  review: { label: 'Repaso', tone: 'ok-soft' },
  relearn: { label: 'Otra vez', tone: 'bad-soft' },
}

/** Tamaño de letra según la longitud, para que "straightforward" o "encogimiento de hombros" quepan en un móvil. */
function sizeFor(text: string): string {
  if (text.length <= 7) return 'text-7xl sm:text-8xl md:text-9xl short:text-7xl'
  if (text.length <= 11) return 'text-6xl sm:text-7xl md:text-8xl short:text-6xl'
  if (text.length <= 16) return 'text-[2.75rem] sm:text-6xl md:text-7xl short:text-5xl'
  return 'text-4xl sm:text-5xl md:text-6xl short:text-4xl'
}

export function WordScreen({ word, direction, reason, solved, mistakes, canReplay, onReplay }: Props) {
  const badge = REASON_BADGE[reason]
  const english = direction === 'en-es'
  const prompt = english ? word.en : word.es
  const status = solved
    ? { text: mistakes === 0 ? '¡Correcto!' : 'Eso es.', tone: 'text-ok' }
    : mistakes > 0
      ? { text: 'No es esa. Prueba otra.', tone: 'text-bad' }
      : { text: english ? 'Elige su traducción' : 'Elige la palabra en inglés', tone: 'text-muted' }

  return (
    <Surface as="section" className="px-5 pt-4 pb-6 sm:px-7 md:px-8 md:pb-8 short:pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
            {english ? 'Inglés' : 'Español'}
          </span>
          {badge && (
            <Badge key={word.id} tone={badge.tone} caps className="animate-rise">
              {badge.label}
            </Badge>
          )}
        </div>
        <IconButton
          label="Escuchar la pronunciación"
          title="Escuchar la pronunciación (Espacio)"
          size="md"
          hover="accent"
          onClick={onReplay}
          disabled={!canReplay}
          className={cn('-mr-2', !canReplay && 'pointer-events-none opacity-0')}
        >
          <SpeakerIcon />
        </IconButton>
      </div>

      <p
        key={word.id}
        lang={english ? 'en' : 'es'}
        className={cn(
          'mt-3 animate-rise text-center font-display leading-none break-words md:mt-5 short:mt-2',
          sizeFor(prompt),
        )}
      >
        {prompt}
      </p>

      <p aria-live="polite" className={cn('mt-6 h-5 text-center text-sm font-medium transition-colors', status.tone)}>
        {status.text}
      </p>
    </Surface>
  )
}
