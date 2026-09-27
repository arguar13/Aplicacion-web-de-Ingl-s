/**
 * Une clases CSS descartando las condicionales falsas.
 *
 * No resuelve conflictos: si dos clases fijan lo mismo (`h-12` y `h-14`), gana la que el CSS de
 * Tailwind define después, no la última escrita. Por eso los componentes base exponen variantes
 * (`variant`, `size`, `tone`) para su aspecto, y su `className` es solo para colocarlos (márgenes,
 * posición, ancho).
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
