import { useState } from 'react'
import { getProgress } from '@/lib/progress'
import { useSettings } from '@/lib/settings'
import { buildSmartDeck, forecast, type SmartDeckKind } from '@/lib/smartDecks'
import { type Mode, trackOf } from '@/lib/types'
import { ForecastChart } from './ForecastChart'
import { Game } from './Game'
import { Header } from './Header'
import { Button } from './ui/Button'
import { Surface } from './ui/Surface'

interface Props {
  kind: SmartDeckKind
  onExit: () => void
  onOpenSettings: () => void
}

/** Qué se ve cuando el mazo está vacío. */
const EMPTY: Record<SmartDeckKind, { title: string; text: string }> = {
  review: { title: 'Todo al día', text: 'No te toca repasar nada hoy. Aquí tienes lo que viene los próximos días.' },
  hard: {
    title: 'Nada difícil por ahora',
    text: 'Aquí aparecerán las palabras que se te olviden más de una vez, para practicarlas aparte.',
  },
  favorites: {
    title: 'Aún no tienes favoritas',
    text: 'Márcalas con la estrella en la ficha de cualquier palabra y practícalas aquí, todas juntas.',
  },
}

/**
 * Repaso del día o "Mis difíciles". El mazo se arma al entrar y queda fijo durante la partida: si
 * cambiara con cada respuesta, las palabras recién repasadas desaparecerían de él.
 */
export function SmartDeckScreen({ kind, onExit, onOpenSettings }: Props) {
  const { mode } = useSettings()
  return (
    <SmartDeckSession key={`${kind}:${mode}`} kind={kind} mode={mode} onExit={onExit} onOpenSettings={onOpenSettings} />
  )
}

function SmartDeckSession({ kind, mode, onExit, onOpenSettings }: Props & { mode: Mode }) {
  const [now] = useState(Date.now)
  const [deck] = useState(() => buildSmartDeck(kind, getProgress(), trackOf(mode), now))

  if (deck.words.length > 0) {
    return <Game deck={deck} mode={mode} onExit={onExit} onOpenSettings={onOpenSettings} />
  }

  const review = kind === 'review'
  const { title, text } = EMPTY[kind]
  return (
    <>
      <Header />
      <main className="grid flex-1 place-items-center px-4 py-12 sm:px-6">
        <Surface className="w-full max-w-md animate-rise px-6 py-9 text-center sm:px-9">
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{text}</p>
          {review && (
            <ForecastChart
              counts={forecast(getProgress(), trackOf(mode), now)}
              now={now}
              className="mx-auto mt-7 max-w-64"
            />
          )}
          <Button variant="primary" size="lg" onClick={onExit} className="mt-8">
            Volver a los niveles
          </Button>
        </Surface>
      </main>
    </>
  )
}
