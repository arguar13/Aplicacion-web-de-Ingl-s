import { useEffect, useId, useRef } from 'react'
import { formsText, POS_LABEL, splitAround, type WordDetails } from '@/lib/details'
import type { Mode, Word } from '@/lib/types'
import { SlowIcon } from './icons'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'
import { Surface } from './ui/Surface'

interface Props {
  word: Word
  mode: Mode
  /** `null` mientras cargan los detalles. */
  details: WordDetails | null
  onContinue: () => void
  onListenSlowly: () => void
}

/**
 * Detalle de la palabra recién resuelta: pronunciación, categoría, formas y una frase de ejemplo.
 * Ocupa el lugar del teclado mientras la partida está detenida.
 */
export function DetailCard({ word, mode, details, onContinue, onListenSlowly }: Props) {
  // Si la pregunta estaba en español, lo que no está a la vista es la palabra inglesa.
  const promptWasSpanish = mode === 'es-en' || mode === 'type'
  const titleId = useId()
  const continueButton = useRef<HTMLButtonElement>(null)
  const forms = details && formsText(details)
  const example = details?.example
  const parts = example && splitAround(example.en, word.en)

  // El foco pasa a "Continuar": con teclado o lector de pantalla, el siguiente paso está a mano.
  useEffect(() => {
    continueButton.current?.focus({ preventScroll: true })
  }, [])

  return (
    <Surface as="section" aria-labelledby={titleId} className="animate-rise px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
      {/* La palabra y su pronunciación ya están arriba: aquí, qué es y qué significa. */}
      <h2 id={titleId} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Badge tone="accent-soft" caps>
          {POS_LABEL[word.pos]}
        </Badge>
        {/* Lo que no está ya a la vista: la traducción si se preguntó en inglés, y al revés. */}
        {!promptWasSpanish ? (
          <>
            <span className="sr-only">
              <span lang="en">{word.en}</span>:
            </span>
            <span lang="es" className="text-lg font-semibold">
              {word.es}
            </span>
          </>
        ) : (
          <>
            <span lang="en" className="font-display text-2xl leading-none">
              {word.en}
            </span>
            <span className="sr-only">
              : <span lang="es">{word.es}</span>
            </span>
          </>
        )}
      </h2>
      {forms && <p className="mt-1 text-[13px] text-muted">{forms}</p>}

      {details === null ? (
        <div className="mt-5 space-y-2" aria-hidden>
          <div className="h-5 w-4/5 animate-pulse rounded-full bg-line" />
          <div className="h-4 w-3/5 animate-pulse rounded-full bg-line" />
        </div>
      ) : (
        example && (
          <figure className="mt-4 border-l-2 border-accent/60 pl-4">
            <blockquote lang="en" className="font-display text-[1.35rem] leading-snug italic sm:text-2xl">
              {parts ? (
                <>
                  {parts[0]}
                  <mark className="rounded-md bg-accent-soft px-1 text-accent not-italic">{parts[1]}</mark>
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
        )
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onListenSlowly} className="-ml-3" aria-keyshortcuts="L">
          <SlowIcon width={18} height={18} />
          Escuchar despacio
        </Button>
        <Button ref={continueButton} variant="primary" size="lg" onClick={onContinue} aria-keyshortcuts="Enter">
          Continuar
          <Kbd tone="accent">Enter</Kbd>
        </Button>
      </div>
    </Surface>
  )
}
