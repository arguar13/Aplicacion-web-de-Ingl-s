/**
 * El vocabulario (src/data/words.json) no va dentro del JavaScript: con más de 8000 palabras sería
 * la mitad de la descarga inicial. Se pide como JSON en paralelo con la app (index.html lo precarga,
 * ver vite/startup-preload.ts) y main.tsx monta la app cuando llega, así que el resto del código lo
 * lee de forma síncrona con vocabulary().
 */
import wordsUrl from 'virtual:vocabulary-url'
import type { Word } from './types'
import { parseCompactVocabulary } from './words'

let loaded: readonly Word[] | null = null

/** Fija el vocabulario ya validado (lo usan loadVocabulary y la preparación de los tests). */
export function setVocabulary(words: readonly Word[]) {
  loaded = words
}

export async function loadVocabulary(): Promise<void> {
  if (loaded) return
  const response = await fetch(wordsUrl)
  if (!response.ok) throw new Error(`No se pudo cargar el vocabulario (HTTP ${response.status})`)
  const raw: unknown = await response.json()
  setVocabulary(parseCompactVocabulary(raw))
}

export function vocabulary(): readonly Word[] {
  if (!loaded)
    throw new Error('El vocabulario aún no se cargó: main.tsx espera a loadVocabulary() antes de montar la app')
  return loaded
}
