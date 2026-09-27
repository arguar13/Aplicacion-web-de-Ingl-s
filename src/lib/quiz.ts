import type { PartOfSpeech, Rng, Word } from './types'

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
  const chosen = new Set([answer.id])
  const tryAdd = (word: Word) => {
    const keys = senses(word.es)
    if (chosen.has(word.id) || keys.some((k) => used.has(k))) return
    for (const key of keys) used.add(key)
    chosen.add(word.id)
    distractors.push(word)
  }
  const full = () => distractors.length >= count - 1

  // De la misma categoría gramatical que la respuesta; si no alcanzan, de una parecida; y si
  // tampoco, cualquiera. Un verbo entre tres sustantivos se adivinaría sin saber la palabra.
  for (const accept of preferenceTiers(answer)) {
    const candidates = pool.filter(accept)
    for (let attempt = 0; attempt < count * 10 && !full() && candidates.length > 0; attempt++) {
      tryAdd(candidates[Math.floor(rng() * candidates.length)])
    }
    const offset = Math.floor(rng() * candidates.length)
    for (let i = 0; i < candidates.length && !full(); i++) tryAdd(candidates[(offset + i) % candidates.length])
    if (full()) break
  }

  return shuffle([answer, ...distractors], rng)
}

/** Familias de categorías: si faltan distractores de la misma, se buscan en la misma familia. */
const FAMILY: Record<PartOfSpeech, string> = {
  noun: 'noun',
  verb: 'verb',
  adj: 'modifier',
  adv: 'modifier',
  pron: 'function',
  det: 'function',
  prep: 'function',
  conj: 'function',
  num: 'function',
  interj: 'function',
}

function preferenceTiers(answer: Word): Array<(word: Word) => boolean> {
  return [(w) => w.pos === answer.pos, (w) => FAMILY[w.pos] === FAMILY[answer.pos], () => true]
}
