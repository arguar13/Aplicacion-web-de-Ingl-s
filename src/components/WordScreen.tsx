import { cn } from '@/lib/cn'
import type { PickReason } from '@/lib/scheduler'
import type { Direction, Word } from '@/lib/types'
import { SlowIcon, SpeakerIcon } from './icons'
import { Badge, type BadgeTone } from './ui/Badge'
import { IconButton } from './ui/IconButton'
import { Kbd } from './ui/Kbd'
import { Surface } from './ui/Surface'

interface Props {
  word: Word
  direction: Direction
  reason: PickReason
  /** Pronunciación en IPA, si ya cargó. */
  ipa: string | undefined
  solved: boolean
  /** La partida está detenida con el detalle a la vista. */
  expanded: boolean
  mistakes: number
  canReplay: boolean
  onReplay: () => void
  onListenSlowly: () => void
  onExpand: () => void
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

export function WordScreen({
  word,
  direction,
  reason,
  ipa,
  solved,
  expanded,
  mistakes,
  canReplay,
  onReplay,
  onListenSlowly,
  onExpand,
}: Props) {
  const badge = REASON_BADGE[reason]
  const english = direction === 'en-es'
  const prompt = english ? word.en : word.es
  const status = solved
    ? { text: mistakes === 0 ? '¡Correcto!' : 'Eso es.', tone: 'text-ok' }
    : mistakes > 0
      ? { text: 'No es esa. Prueba otra.', tone: 'text-bad' }
      : { text: english ? 'Elige su traducción' : 'Elige la palabra en inglés', tone: 'text-muted' }
  // En español → inglés, la palabra inglesa y su pronunciación delatarían la respuesta.
  const reveal = english ? (
    ipa
  ) : solved ? (
    <>
      <span className="font-semibold text-ink">{word.en}</span>
      {ipa && <> {ipa}</>}
    </>
  ) : undefined

  return (
    <Surface as="section" className="px-5 pt-4 pb-5 sm:px-7 md:px-8 md:pb-7 short:pb-4">
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
        <div
          className={cn('-mr-2 flex items-center transition-opacity', !canReplay && 'pointer-events-none opacity-0')}
        >
          <IconButton
            label="Escuchar despacio"
            title="Escuchar despacio (L)"
            size="md"
            hover="accent"
            onClick={onListenSlowly}
            disabled={!canReplay}
            aria-keyshortcuts="L"
          >
            <SlowIcon />
          </IconButton>
          <IconButton
            label="Escuchar la pronunciación"
            title="Escuchar la pronunciación (Espacio)"
            size="md"
            hover="accent"
            onClick={onReplay}
            disabled={!canReplay}
            aria-keyshortcuts="Space"
          >
            <SpeakerIcon />
          </IconButton>
        </div>
      </div>

      {/* La palabra es el título de la pantalla: lo primero que anuncia un lector de pantalla. */}
      <h1
        key={word.id}
        lang={english ? 'en' : 'es'}
        className={cn(
          'mt-3 animate-rise text-center font-display leading-none break-words md:mt-5 short:mt-2',
          sizeFor(prompt),
        )}
      >
        {prompt}
      </h1>

      {/* Altura reservada: la pronunciación aparece sin mover el resto. */}
      <p lang="en" className="mt-2 h-6 text-center text-[15px] text-muted">
        {reveal && (
          <span key={`${word.id}:${solved}`} className="animate-rise">
            {reveal}
          </span>
        )}
      </p>

      <div className="mt-3 flex h-8 items-center justify-center gap-2">
        <p aria-live="polite" className={cn('text-sm font-medium transition-colors', status.tone)}>
          {status.text}
        </p>
        {solved && !expanded && (
          <button
            type="button"
            onClick={onExpand}
            aria-keyshortcuts="E"
            className="inline-flex h-8 animate-rise cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
          >
            Ver ejemplo
            <Kbd className="hidden h-5 min-w-5 pointer-fine:inline-flex">E</Kbd>
          </button>
        )}
      </div>
    </Surface>
  )
}
