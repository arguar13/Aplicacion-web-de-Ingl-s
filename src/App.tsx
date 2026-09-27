import { useEffect } from 'react'
import { DeckPicker } from '@/components/DeckPicker'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SmartDeckScreen } from '@/components/SmartDeckScreen'
import { Game } from '@/components/Game'
import { SettingsDialog } from '@/components/SettingsDialog'
import { UpdateToast } from '@/components/UpdateToast'
import { ALL_WORDS, type Deck } from '@/lib/decks'
import { setLastDeck } from '@/lib/progress'
import { pruneStaleAudio } from '@/lib/pwa'
import { getRoute, goBack, navigate, useRoute } from '@/lib/router'
import { formatHash, HOME, titleOf } from '@/lib/routes'
import { useProtectOnceThereIsProgress } from '@/hooks/useProtectOnceThereIsProgress'
import { useSettings } from '@/lib/settings'
import type { SmartDeckKind } from '@/lib/smartDecks'

const openSettings = () => navigate({ ...getRoute(), panel: 'settings' })

/** El diálogo también se cierra solo (Esc, tocar fuera): solo se navega si la ruta aún lo tiene abierto. */
function closeSettings() {
  const route = getRoute()
  if (route.panel) goBack({ ...route, panel: null })
}

function openDeck(deck: Deck) {
  setLastDeck(deck.id)
  navigate({ screen: { name: 'deck', deck }, panel: null })
}

const openSmart = (kind: SmartDeckKind) => navigate({ screen: { name: 'smart', kind }, panel: null })

const exitToHome = () => goBack(HOME)
const recoverToHome = () => navigate(HOME, { replace: true })

export default function App() {
  const route = useRoute()
  const screenKey = formatHash({ screen: route.screen, panel: null })
  const { direction } = useSettings()

  useEffect(() => {
    document.title = titleOf(route)
  }, [route])

  useProtectOnceThereIsProgress()

  useEffect(() => {
    void pruneStaleAudio(ALL_WORDS.map((word) => word.id))
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <ErrorBoundary resetKey={screenKey} onGoHome={recoverToHome}>
        {/* La clave vuelve a montar el contenedor en cada pantalla y con él su animación de entrada. */}
        <div key={screenKey} className="flex flex-1 animate-screen flex-col">
          {route.screen.name === 'smart' ? (
            <SmartDeckScreen kind={route.screen.kind} onExit={exitToHome} onOpenSettings={openSettings} />
          ) : route.screen.name === 'deck' ? (
            <Game
              key={`${route.screen.deck.id}:${direction}`}
              deck={route.screen.deck}
              direction={direction}
              onExit={exitToHome}
              onOpenSettings={openSettings}
            />
          ) : (
            <DeckPicker onPick={openDeck} onOpenSmart={openSmart} onOpenSettings={openSettings} />
          )}
        </div>
      </ErrorBoundary>
      <SettingsDialog open={route.panel === 'settings'} onClose={closeSettings} />
      <UpdateToast />
    </div>
  )
}
