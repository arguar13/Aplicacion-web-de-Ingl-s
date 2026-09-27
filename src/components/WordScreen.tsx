import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { splitAround } from '@/lib/details'
import type { PickReason } from '@/lib/scheduler'
import type { Mode, Word } from '@/lib/types'
import type { TypedVerdict } from '@/lib/typing'
import { SlowIcon, SpeakerIcon } from './icons'
import { Badge, type BadgeTone } from './ui/Badge'
import { IconButton } from './ui/IconButton'
import { Kbd } from './ui/Kbd'
import { Surface } from './ui/Surface'

interface Props {
  word: Word
  mode: Mode
  reason: PickReason
  /** Pronunciación en IPA, si ya cargó. */
  ipa: string | undefined
  /** Frase de ejemplo (modo completar); `null` mientras cargan los detalles. */
  example: { en: string; es: string } | null | undefined
  solved: boolean
  /** La partida está detenida con el detalle a la vista. */
  expanded: boolean
  mistakes: number
  /** Modo escribir: cómo se juzgó lo escrito. */
  typedVerdict: TypedVerdict | undefined
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

const PROMPT_LABEL: Record<Mode, string> = {
  'en-es': 'Inglés',
  'es-en': 'Español',
  listen: 'Escucha',
  type: 'Español',
  cloze: 'Completa la frase',
}

const INSTRUCTION: Record<Mode, string> = {
  'en-es': 'Elige su traducción',
  'es-en': 'Elige la palabra en inglés',
  listen: 'Elige lo que oíste',
  type: 'Escríbela en inglés',
  cloze: 'Elige la palabra que falta',
}

/** Tamaño de letra según la longitud, para que "straightforward" o "encogimiento de hombros" quepan en un móvil. */
function sizeFor(text: string): string {
  if (text.length <= 7) return 'text-7xl sm:text-8xl md:text-9xl short:text-7xl'
  if (text.length <= 11) return 'text-6xl sm:text-7xl md:text-8xl short:text-6xl'
  if (text.length <= 16) return 'text-[2.75rem] sm:text-6xl md:text-7xl short:text-5xl'
  return 'text-4xl sm:text-5xl md:text-6xl short:text-4xl'
}

function statusOf(mode: Mode, solved: boolean, mistakes: number, verdict: TypedVerdict | undefined) {
  // La corrección letra por letra aparece bajo el campo de texto.
  if (verdict === 'almost') return { text: '¡Casi!', tone: 'text-ok' }
  if (verdict === 'wrong') return { text: 'No era esa.', tone: 'text-bad' }
  if (solved) return { text: mistakes === 0 ? '¡Correcto!' : 'Eso es.', tone: 'text-ok' }
  if (mistakes > 0) return { text: 'No es esa. Prueba otra.', tone: 'text-bad' }
  return { text: INSTRUCTION[mode], tone: 'text-muted' }
}

export function WordScreen({
  word,
  mode,
  reason,
  ipa,
  example,
  solved,
  expanded,
  mistakes,
  typedVerdict,
  canReplay,
  onReplay,
  onListenSlowly,
  onExpand,
}: Props) {
  const badge = REASON_BADGE[reason]
  const status = statusOf(mode, solved, mistakes, typedVerdict)

  return (
    <Surface as="section" className="px-5 pt-4 pb-5 sm:px-7 md:px-8 md:pb-7 short:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">{PROMPT_LABEL[mode]}</span>
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

      <Prompt word={word} mode={mode} example={example} solved={solved} onReplay={onReplay} />

      {/* Altura reservada: la pronunciación aparece sin mover el resto. */}
      <p className="mt-2 min-h-6 text-center text-[15px] text-muted">
        <Reveal key={`${word.id}:${solved}`} word={word} mode={mode} ipa={ipa} example={example} solved={solved} />
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
            <Kbd size="sm">E</Kbd>
          </button>
        )}
      </div>
    </Surface>
  )
}

/** La pregunta: la palabra, su traducción, un botón para oírla o una frase con un hueco. */
function Prompt({
  word,
  mode,
  example,
  solved,
  onReplay,
}: Pick<Props, 'word' | 'mode' | 'example' | 'solved' | 'onReplay'>) {
  const heading = (content: ReactNode, lang: 'en' | 'es', size: string) => (
    <h1
      key={`${word.id}:${mode === 'listen' && solved}`}
      lang={lang}
      className={cn('mt-3 animate-rise text-center font-display leading-none break-words md:mt-5 short:mt-2', size)}
    >
      {content}
    </h1>
  )

  if (mode === 'listen' && !solved) {
    return (
      <div className="mt-3 flex flex-col items-center md:mt-5">
        <h1 className="sr-only">Escucha la palabra</h1>
        <button
          key={word.id}
          type="button"
          onClick={onReplay}
          aria-label="Volver a escuchar la palabra"
          className="grid size-24 animate-rise cursor-pointer place-items-center rounded-full bg-accent-soft text-accent transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent active:scale-95 sm:size-28 short:size-20"
        >
          <SpeakerIcon width={40} height={40} strokeWidth={1.6} />
        </button>
      </div>
    )
  }

  if (mode === 'cloze') {
    if (!example) {
      return (
        <div className="mt-5 space-y-3" aria-hidden>
          <div className="mx-auto h-7 w-5/6 animate-pulse rounded-full bg-line" />
          <div className="mx-auto h-7 w-2/3 animate-pulse rounded-full bg-line" />
        </div>
      )
    }
    const parts = splitAround(example.en, word.en)
    const [before, match, after] = parts ?? [example.en, '', '']
    return heading(
      <>
        {before}
        {solved ? (
          <mark className="rounded-md bg-accent-soft px-1 text-accent">{match}</mark>
        ) : (
          <span className="mx-1 inline-block w-[4ch] border-b-2 border-accent align-baseline" aria-label="hueco" />
        )}
        {after}
      </>,
      'en',
      'text-3xl leading-snug sm:text-4xl md:text-[2.75rem]',
    )
  }

  const english = mode === 'en-es' || mode === 'listen'
  const text = english ? word.en : word.es
  return heading(text, english ? 'en' : 'es', sizeFor(text))
}

/** Lo que aparece bajo la pregunta: pronunciación, la palabra inglesa al acertar o la traducción de la frase. */
function Reveal({ word, mode, ipa, example, solved }: Pick<Props, 'word' | 'mode' | 'ipa' | 'example' | 'solved'>) {
  if (mode === 'cloze') return example ? <span lang="es">{example.es}</span> : null
  if (mode === 'en-es' || (mode === 'listen' && solved)) return ipa ? <span className="animate-rise">{ipa}</span> : null
  if ((mode === 'es-en' || mode === 'type') && solved) {
    return (
      <span className="animate-rise" lang="en">
        <span className="font-semibold text-ink">{word.en}</span>
        {ipa && <> {ipa}</>}
      </span>
    )
  }
  return null
}
