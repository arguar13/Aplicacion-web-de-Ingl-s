import type { Rng, Round, Word } from './types'

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

/** Elige una palabra al azar evitando las de `avoid` (p. ej. la actual y la siguiente). */
export function pickWord(pool: readonly Word[], avoid: ReadonlySet<string> = new Set(), rng: Rng = Math.random): Word {
  if (pool.length === 0) throw new Error('El conjunto de palabras está vacío')
  for (let attempt = 0; attempt < 20; attempt++) {
    const word = pool[Math.floor(rng() * pool.length)]
    if (!avoid.has(word.id)) return word
  }
  return pool.find((w) => !avoid.has(w.id)) ?? pool[0]
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

export function createRound(pool: readonly Word[], avoid?: ReadonlySet<string>, rng: Rng = Math.random): Round {
  const word = pickWord(pool, avoid, rng)
  return { word, options: buildOptions(word, pool, OPTIONS_PER_ROUND, rng) }
}
