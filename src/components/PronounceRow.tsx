import { useEffect, useRef, useState } from 'react'
import { feedback } from '@/lib/feedback'
import { canRecognizeSpeech, listenFor } from '@/lib/speech'
import { cn } from '@/lib/cn'
import { MicIcon } from './icons'
import { Button } from './ui/Button'

type State =
  | { step: 'idle' }
  | { step: 'listening' }
  | { step: 'ok' }
  | { step: 'miss'; heard: string }
  | { step: 'silence' }
  | { step: 'denied' }
  | { step: 'failed' }

const MESSAGES: Record<Exclude<State['step'], 'idle' | 'listening' | 'miss'>, string> = {
  ok: '¡Bien dicho!',
  silence: 'No te oí. Toca el micrófono y di la palabra.',
  denied: 'Sin permiso para usar el micrófono. Actívalo en los ajustes del navegador.',
  failed: 'El reconocimiento de voz no respondió. Prueba de nuevo en un momento.',
}

/**
 * Practicar la pronunciación: se dice la palabra y el navegador la reconoce. Solo donde el
 * navegador tiene reconocimiento de voz; en los demás no se muestra.
 */
export function PronounceRow({ word }: { word: string }) {
  const [state, setState] = useState<State>({ step: 'idle' })
  const cancel = useRef<(() => void) | null>(null)
  useEffect(() => () => cancel.current?.(), [])
  if (!canRecognizeSpeech()) return null

  async function listen() {
    cancel.current?.()
    setState({ step: 'listening' })
    const session = listenFor(word)
    cancel.current = session.cancel
    const result = await session.result
    cancel.current = null
    if ('error' in result) {
      setState({ step: result.error === 'no-speech' ? 'silence' : result.error })
      return
    }
    feedback(result.ok ? 'correct' : 'wrong')
    setState(result.ok ? { step: 'ok' } : { step: 'miss', heard: result.heard[0] ?? '' })
  }

  const listening = state.step === 'listening'
  const message =
    state.step === 'miss'
      ? `Oí «${state.heard}». Escúchala y prueba otra vez.`
      : state.step === 'idle' || state.step === 'listening'
        ? null
        : MESSAGES[state.step]

  return (
    <div className="mt-5 rounded-2xl border border-line bg-bg px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">Pronúnciala</p>
          <p className="text-[13px] text-muted">
            {listening ? 'Escuchando… di la palabra en inglés' : 'Dila en voz alta y te digo si se entiende.'}
          </p>
        </div>
        <Button
          variant={listening ? 'primary' : 'secondary'}
          aria-pressed={listening}
          onClick={() => void listen()}
          className={cn(listening && 'animate-pulse')}
        >
          <MicIcon width={16} height={16} />
          {listening ? 'Escuchando' : 'Decirla'}
        </Button>
      </div>
      <p
        role="status"
        className={cn('text-sm font-medium empty:hidden', state.step === 'ok' ? 'mt-2 text-ok' : 'mt-2 text-muted')}
      >
        {message}
      </p>
    </div>
  )
}
