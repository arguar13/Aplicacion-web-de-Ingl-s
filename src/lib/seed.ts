/** Números estables a partir de una fecha: mismo día, mismo resultado en cualquier dispositivo. */

/** Número estable a partir de un texto (FNV-1a de 32 bits). */
export function stringSeed(text: string): number {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

/** Número estable a partir de la fecha ("2026-09-29"). */
export const daySeed = (day: string): number => stringSeed(day)

/** Generador de números pseudoaleatorios (0–1) determinista a partir de una semilla (mulberry32). */
export function seededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
