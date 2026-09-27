import type { Rng, Word } from './types'

export const OPTIONS_PER_ROUND = 4

/** Clave para comparar traducciones: sin mayúsculas, tildes ni espacios sobrantes. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Sentidos de una traducción: "a, para" → ["a", "para"]; "fue (de ir)" → ["fue"];
 * "padre o madre" → ["padre", "madre"].
 */
export function senses(translation: string): string[] {
  return translation
    .replace(/\([^)]*\)/g, '')
    .split(/,| o /)
    .map(normalize)
    .filter(Boolean)
}

/**
 * Construye las opciones de una ronda: la respuesta más distractores que no compartan ningún
 * sentido con ella ni entre sí. Así nunca hay dos teclas "correctas", tampoco en el modo
 * español → inglés (p. ej. "to" = "a, para" y "for" = "para" no salen juntas).
 */
export function buildOptions(
  answer: Word,
  pool: readonly Word[],
  count = OPTIONS_PER_ROUND,
  rng: Rng = Math.random,
): Word[] {
  const used = new Set(senses(answer.es))
  const distractors: Word[] = []
  const tryAdd = (word: Word) => {
    const keys = senses(word.es)
    if (word.id === answer.id || keys.some((k) => used.has(k))) return
    for (const key of keys) used.add(key)
    distractors.push(word)
  }

  for (let attempt = 0; attempt < count * 10 && distractors.length < count - 1; attempt++) {
    tryAdd(pool[Math.floor(rng() * pool.length)])
  }
  for (const word of pool) {
    if (distractors.length >= count - 1) break
    tryAdd(word)
  }

  return shuffle([answer, ...distractors], rng)
}
