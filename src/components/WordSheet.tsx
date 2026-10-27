import { lazy, Suspense } from 'react'
import { ALL_WORDS } from '@/lib/decks'
import { Sheet } from './ui/Sheet'

const WORDS = new Map(ALL_WORDS.map((word) => [word.id, word]))

/**
 * El contenido de la ficha (detalles, voz, pronunciación, historial) no hace falta para el primer
 * pintado: se carga al abrir la primera ficha, como Ajustes.
 */
const WordSheetContent = lazy(() =>
  import('./WordSheetContent').then((module) => ({ default: module.WordSheetContent })),
)

/** Ficha de una palabra, como panel sobre la pantalla actual (`?palabra=<id>`). */
export function WordSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const word = id ? WORDS.get(id) : undefined
  return (
    <Sheet open={word !== undefined} onClose={onClose} title={word?.en ?? ''} titleLang="en">
      {word && (
        <Suspense fallback={null}>
          <WordSheetContent key={word.id} word={word} />
        </Suspense>
      )}
    </Sheet>
  )
}
