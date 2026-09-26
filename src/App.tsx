import { useState } from 'react'
import { DeckPicker } from '@/components/DeckPicker'
import { Game } from '@/components/Game'
import { Header } from '@/components/Header'
import type { Deck } from '@/lib/decks'

export default function App() {
  const [deck, setDeck] = useState<Deck | null>(null)

  return (
    <div className="flex min-h-dvh flex-col">
      {deck ? (
        <Game key={deck.id} deck={deck} onExit={() => setDeck(null)} />
      ) : (
        <>
          <Header />
          <DeckPicker onPick={setDeck} />
        </>
      )}
    </div>
  )
}
