/**
 * Leer en voz alta: compara lo que oyó el reconocimiento de voz con la frase y dice qué palabras se
 * entendieron. Se alinean las dos secuencias (subsecuencia común más larga), así una palabra de más
 * o de menos no desplaza a las demás, y cada palabra se compara con la misma tolerancia que al
 * escribir (el reconocedor también se equivoca en una letra).
 */
import { judgeTyped } from './typing'

export interface TargetWord {
  /** Tal como aparece en el texto, con su puntuación («morning,»). */
  text: string
  /** Normalizada para comparar («morning»). */
  key: string
}

/** Minúsculas, sin tildes («café» → «cafe»), apóstrofos rectos y sin la puntuación de los extremos. */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replaceAll(/[‘’`´]/g, "'")
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .replaceAll(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')
    .replaceAll(/^'+|'+$/g, '')
}

/** Las palabras de una frase, con lo que se muestra y lo que se compara. Los guiones separan. */
export function targetWords(sentence: string): TargetWord[] {
  return sentence
    .split(/\s+/)
    .flatMap((chunk) => {
      const parts = chunk.split(/(?<=[a-z])-(?=[a-z])/i)
      return parts.map((part, index) => ({
        text: index < parts.length - 1 ? `${part}-` : part,
        key: normalizeWord(part),
      }))
    })
    .filter((word) => word.key.length > 0)
}

const UNITS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** El reconocedor escribe «4» o «20» donde el texto dice «four» o «twenty»: se pasan a palabras (hasta 99). */
function numberWords(token: string): string[] {
  if (!/^\d{1,2}$/.test(token)) return [token]
  const n = Number(token)
  if (n < 20) return [UNITS[n]]
  const tens = TENS[Math.floor(n / 10)]
  return n % 10 === 0 ? [tens] : [tens, UNITS[n % 10]]
}

/** Lo oído, en palabras comparables («It's 4 o'clock.» → it's, four, o'clock). */
export function heardWords(transcript: string): string[] {
  return transcript
    .split(/[\s-]+/)
    .map(normalizeWord)
    .filter(Boolean)
    .flatMap(numberWords)
}

/** ¿Es la misma palabra? Igual, o con un error de una letra si tiene 4 o más (como al escribir). */
export function sameWord(heard: string, target: string): boolean {
  if (heard === target) return true
  if (target.length < 4) return false
  return judgeTyped(heard, target) !== 'wrong'
}

/**
 * Qué palabras de la frase se oyeron: un booleano por palabra. Alineación por la subsecuencia común
 * más larga entre lo que se esperaba y lo que se oyó.
 */
export function alignSpoken(target: readonly TargetWord[], heard: readonly string[]): boolean[] {
  const rows = target.length
  const cols = heard.length
  // lcs[i][j]: palabras emparejadas entre target[i..] y heard[j..].
  const lcs = Array.from({ length: rows + 1 }, () => Array.from({ length: cols + 1 }, () => 0))
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      lcs[i][j] = sameWord(heard[j], target[i].key) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  const matched = Array.from({ length: rows }, () => false)
  let i = 0
  let j = 0
  while (i < rows && j < cols) {
    if (sameWord(heard[j], target[i].key) && lcs[i][j] === lcs[i + 1][j + 1] + 1) {
      matched[i] = true
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++
    else j++
  }
  return matched
}

/** Acierto de una frase (0–1): palabras entendidas sobre el total. */
export const spokenScore = (matched: readonly boolean[]) =>
  matched.length === 0 ? 0 : matched.filter(Boolean).length / matched.length

/** Con esto o más, una frase se da por bien leída y se puede pasar a la siguiente sin repetir. */
export const SENTENCE_PASS = 0.8
