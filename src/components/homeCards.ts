import { cn } from '@/lib/cn'
import type { Deck } from '@/lib/decks'

/** Base de las tarjetas pulsables del inicio: se elevan al pasar el puntero y siguen su luz. */
export const cardBase = cn(
  'group relative w-full cursor-pointer rounded-3xl border spotlight text-left',
  'transition-[translate,scale,box-shadow,border-color] duration-200',
  'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
)

/** Tecla para elegir cada mazo: 1–9 para los niveles, 0 para todas las palabras. */
export const shortcutOf = (deck: Deck) => (deck.level === null ? '0' : deck.level <= 9 ? String(deck.level) : null)
