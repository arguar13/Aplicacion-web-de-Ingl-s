import { useEffect } from 'react'
import { DeckPicker } from '@/components/DeckPicker'
import { Game } from '@/components/Game'
import { SettingsDialog } from '@/components/SettingsDialog'
import { UpdateToast } from '@/components/UpdateToast'
import type { Deck } from '@/lib/decks'
import { setLastDeck } from '@/lib/progress'
import { getRoute, goBack, navigate, useRoute } from '@/lib/router'
import { HOME, titleOf } from '@/lib/routes'
import { useSettings } from '@/lib/settings'

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

const exitToHome = () => goBack(HOME)

export default function App() {
  const route = useRoute()
  const { direction } = useSettings()

  useEffect(() => {
    document.title = titleOf(route)
  }, [route])

  return (
    <div className="flex min-h-dvh flex-col">
      {route.screen.name === 'deck' ? (
        <Game
          key={`${route.screen.deck.id}:${direction}`}
          deck={route.screen.deck}
          direction={direction}
          onExit={exitToHome}
          onOpenSettings={openSettings}
        />
      ) : (
        <DeckPicker onPick={openDeck} onOpenSettings={openSettings} />
      )}
      <SettingsDialog open={route.panel === 'settings'} onClose={closeSettings} />
      <UpdateToast />
    </div>
  )
}
