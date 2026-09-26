import { useState } from 'react'
import { DeckPicker } from '@/components/DeckPicker'
import { Game } from '@/components/Game'
import type { Deck } from '@/lib/decks'
import { setLastDeck } from '@/lib/progress'

export default function App() {
  const [deck, setDeck] = useState<Deck | null>(null)

  function pick(next: Deck) {
    setLastDeck(next.id)
    setDeck(next)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {deck ? <Game key={deck.id} deck={deck} onExit={() => setDeck(null)} /> : <DeckPicker onPick={pick} />}
    </div>
  )
}
