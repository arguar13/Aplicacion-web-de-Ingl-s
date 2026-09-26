import { useState } from 'react'
import { DeckPicker } from '@/components/DeckPicker'
import { Game } from '@/components/Game'
import { SettingsDialog } from '@/components/SettingsDialog'
import type { Deck } from '@/lib/decks'
import { setLastDeck } from '@/lib/progress'
import { useSettings } from '@/lib/settings'

export default function App() {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { direction } = useSettings()
  const openSettings = () => setSettingsOpen(true)

  function pick(next: Deck) {
    setLastDeck(next.id)
    setDeck(next)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {deck ? (
        <Game
          key={`${deck.id}:${direction}`}
          deck={deck}
          direction={direction}
          onExit={() => setDeck(null)}
          onOpenSettings={openSettings}
        />
      ) : (
        <DeckPicker onPick={pick} onOpenSettings={openSettings} />
      )}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
