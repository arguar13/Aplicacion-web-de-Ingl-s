import { type FormEvent, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { Word } from '@/lib/types'
import { diffAgainst, type TypedVerdict } from '@/lib/typing'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'
import { Surface } from './ui/Surface'

interface Props {
  word: Word
  solved: boolean
  typed: { text: string; verdict: TypedVerdict } | null
  onSubmit: (text: string) => void
  /** Tras comprobar, Enter en el campo pasa a la siguiente palabra. */
  onContinue: () => void
}

/**
 * Modo escribir: un campo para la palabra inglesa. Al comprobar, muestra la respuesta correcta con
 * las letras que no coinciden marcadas.
 */
export function TypeAnswer({ word, solved, typed, onSubmit, onContinue }: Props) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)

  // Cada palabra empieza con el campo vacío y enfocado (en el móvil, con el teclado abierto).
  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (solved) onContinue()
    else onSubmit(text)
  }

  return (
    <Surface className="px-5 py-5 sm:px-6">
      <form onSubmit={submit} className="flex items-center gap-2.5">
        <label htmlFor={`type-${word.id}`} className="sr-only">
          La palabra en inglés
        </label>
        <input
          ref={input}
          id={`type-${word.id}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={solved}
          lang="en"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Escribe en inglés…"
          className={cn(
            'h-14 min-w-0 flex-1 rounded-2xl border bg-raised px-4 font-display text-3xl text-ink outline-none placeholder:font-sans placeholder:text-base placeholder:text-muted',
            'transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]',
            typed?.verdict === 'wrong' ? 'border-bad/50' : typed ? 'border-ok/50' : 'border-line-strong',
          )}
        />
        {!solved && (
          <Button type="submit" variant="primary" size="xl" disabled={!text.trim()}>
            Comprobar
            <Kbd tone="accent">Enter</Kbd>
          </Button>
        )}
      </form>

      {typed && typed.verdict !== 'exact' && (
        <p className="mt-4 animate-rise text-center text-[15px] text-muted">
          {typed.verdict === 'almost' ? 'Se escribe ' : 'Era '}
          <span lang="en" className="font-display text-3xl tracking-wide">
            {diffAgainst(typed.text, word.en).map((letter) => (
              <span key={letter.position} className={letter.ok ? 'text-ink' : 'rounded-sm bg-bad-soft text-bad'}>
                {letter.char}
              </span>
            ))}
          </span>
        </p>
      )}
    </Surface>
  )
}
