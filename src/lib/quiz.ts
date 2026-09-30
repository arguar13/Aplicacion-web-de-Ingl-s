import type { PartOfSpeech, Rng, Word } from './types'

export const OPTIONS_PER_ROUND = 4
/** Desde esta estabilidad (días) la palabra está afianzada y sus distractores se le parecen. */
export const CONFUSABLE_STABILITY = 10
/** Entre cuántas de las más parecidas se eligen los distractores de una palabra afianzada. */
const CONFUSABLE_POOL = 12

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
  {
    confusable = false,
  }: {
    /**
     * Palabra ya afianzada: los distractores de su misma categoría se eligen entre los que más se
     * le parecen ("affect" / "effect"), para que siga exigiendo atención.
     */
    confusable?: boolean
  } = {},
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
  for (const [tier, accept] of preferenceTiers(answer).entries()) {
    const all = pool.filter(accept)
    const candidates =
      confusable && tier === 0
        ? all.toSorted((a, b) => resemblance(answer.en, b.en) - resemblance(answer.en, a.en)).slice(0, CONFUSABLE_POOL)
        : all
    for (let attempt = 0; attempt < count * 10 && !full() && candidates.length > 0; attempt++) {
      tryAdd(candidates[Math.floor(rng() * candidates.length)])
    }
    const offset = Math.floor(rng() * candidates.length)
    for (let i = 0; i < candidates.length && !full(); i++) tryAdd(candidates[(offset + i) % candidates.length])
    if (full()) break
  }

  return shuffle([answer, ...distractors], rng)
}

/**
 * Cuánto se parecen dos palabras inglesas a la vista: comienzo y final compartidos (lo que más
 * confunde al leer rápido) y longitud parecida.
 */
export function resemblance(a: string, b: string): number {
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  if (x === y) return 0
  let prefix = 0
  while (prefix < Math.min(x.length, y.length) && x[prefix] === y[prefix]) prefix++
  let suffix = 0
  while (suffix < Math.min(x.length, y.length) - prefix && x.at(-1 - suffix) === y.at(-1 - suffix)) suffix++
  return prefix * 2 + suffix - Math.abs(x.length - y.length) * 0.5
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
