import { useEffect } from 'react'
import { BlitzScreen } from '@/components/BlitzScreen'
import { DeckPicker } from '@/components/DeckPicker'
import { DictionaryScreen } from '@/components/DictionaryScreen'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Game } from '@/components/Game'
import { SettingsDialog } from '@/components/SettingsDialog'
import { SmartDeckScreen } from '@/components/SmartDeckScreen'
import { StatsScreen } from '@/components/stats/StatsScreen'
import { UpdateToast } from '@/components/UpdateToast'
import { WordSheet } from '@/components/WordSheet'
import { useProtectOnceThereIsProgress } from '@/hooks/useProtectOnceThereIsProgress'
import { ALL_WORDS, type Deck } from '@/lib/decks'
import { setLastDeck } from '@/lib/progress'
import { pruneStaleAudio } from '@/lib/pwa'
import { getRoute, goBack, navigate, useRoute } from '@/lib/router'
import { formatHash, HOME, type Screen, titleOf } from '@/lib/routes'
import { useSettings } from '@/lib/settings'
import type { SmartDeckKind } from '@/lib/smartDecks'
import type { Mode } from '@/lib/types'

const go = (screen: Screen) => navigate({ screen, panel: null })
const openSettings = () => navigate({ ...getRoute(), panel: 'settings' })
const openWord = (word: string) => navigate({ ...getRoute(), panel: { word } })

/** Los paneles también se cierran solos (Esc, tocar fuera): solo se navega si la ruta aún tiene uno. */
function closePanel() {
  const route = getRoute()
  if (route.panel) goBack({ ...route, panel: null })
}

function openDeck(deck: Deck) {
  setLastDeck(deck.id)
  go({ name: 'deck', deck })
}

const openSmart = (kind: SmartDeckKind) => go({ name: 'smart', kind })
const exitToHome = () => goBack(HOME)
const recoverToHome = () => navigate(HOME, { replace: true })

function ScreenView({ screen, mode }: { screen: Screen; mode: Mode }) {
  switch (screen.name) {
    case 'home':
      return (
        <DeckPicker
          onPick={openDeck}
          onOpenSmart={openSmart}
          onOpenBlitz={() => go({ name: 'blitz' })}
          onOpenStats={() => go({ name: 'stats' })}
          onOpenDictionary={() => go({ name: 'dictionary' })}
          onOpenSettings={openSettings}
        />
      )
    case 'deck':
      return (
        <Game
          key={`${screen.deck.id}:${mode}`}
          deck={screen.deck}
          mode={mode}
          onExit={exitToHome}
          onOpenSettings={openSettings}
        />
      )
    case 'smart':
      return <SmartDeckScreen kind={screen.kind} onExit={exitToHome} onOpenSettings={openSettings} />
    case 'blitz':
      return <BlitzScreen onExit={exitToHome} />
    case 'stats':
      return <StatsScreen onExit={exitToHome} />
    case 'dictionary':
      return <DictionaryScreen onExit={exitToHome} onOpenWord={openWord} />
  }
}

export default function App() {
  const route = useRoute()
  const screenKey = formatHash({ screen: route.screen, panel: null })
  const { mode } = useSettings()

  useEffect(() => {
    document.title = titleOf(route)
  }, [route])

  useProtectOnceThereIsProgress()

  useEffect(() => {
    void pruneStaleAudio(ALL_WORDS.map((word) => word.id))
  }, [])

  const { panel } = route
  return (
    <div className="flex min-h-dvh flex-col">
      <ErrorBoundary resetKey={screenKey} onGoHome={recoverToHome}>
        {/* La clave vuelve a montar el contenedor en cada pantalla y con él su animación de entrada. */}
        <div key={screenKey} className="flex flex-1 animate-screen flex-col">
          <ScreenView screen={route.screen} mode={mode} />
        </div>
      </ErrorBoundary>
      <SettingsDialog open={panel === 'settings'} onClose={closePanel} />
      <WordSheet id={panel !== null && panel !== 'settings' ? panel.word : null} onClose={closePanel} />
      <UpdateToast />
    </div>
  )
}
