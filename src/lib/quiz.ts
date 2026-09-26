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
 * Construye las opciones de una ronda: la respuesta más distractores cuya
 * traducción sea distinta, para que nunca haya dos teclas "correctas".
 */
export function buildOptions(answer: Word, pool: readonly Word[], count = OPTIONS_PER_ROUND, rng: Rng = Math.random): Word[] {
  const used = new Set([normalize(answer.es)])
  const distractors: Word[] = []
  const tryAdd = (word: Word) => {
    const key = normalize(word.es)
    if (word.id === answer.id || used.has(key)) return
    used.add(key)
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
