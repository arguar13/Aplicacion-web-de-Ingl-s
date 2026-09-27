/**
 * Respuestas escritas: comparación tolerante y diferencia letra por letra para el feedback.
 */

export type TypedVerdict = 'exact' | 'almost' | 'wrong'

/** Palabras con menos letras no admiten "casi": un error cambia la palabra ("in" → "on"). */
const MIN_LENGTH_FOR_TYPO = 4

/** Forma comparable: sin mayúsculas, espacios sobrantes ni apóstrofos tipográficos. */
export function normalizeTyped(text: string): string {
  return text.trim().toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ')
}

/**
 * Tabla de distancias de edición entre los prefijos de `a` y `b`. Con `transpositions`, el
 * intercambio de dos letras vecinas cuenta como un solo error (Damerau-Levenshtein).
 */
function distanceTable(a: string, b: string, transpositions: boolean): number[][] {
  const d = Array.from({ length: a.length + 1 }, (_row, i) =>
    Array.from({ length: b.length + 1 }, (_cell, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (transpositions && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d
}

/** Distancia de Damerau-Levenshtein (con transposiciones de letras vecinas). */
export const editDistance = (a: string, b: string) => distanceTable(a, b, true)[a.length][b.length]

/** Exacta, "casi" (un error en una palabra de 4 letras o más) o incorrecta. */
export function judgeTyped(input: string, target: string): TypedVerdict {
  const typed = normalizeTyped(input)
  const expected = normalizeTyped(target)
  if (typed === expected) return 'exact'
  if (expected.length >= MIN_LENGTH_FOR_TYPO && editDistance(typed, expected) === 1) return 'almost'
  return 'wrong'
}

export interface LetterDiff {
  /** Posición en la palabra correcta (identifica la letra aunque se repita). */
  position: number
  char: string
  /** La letra de la respuesta correcta coincide con lo escrito, o falta / es otra. */
  ok: boolean
}

/**
 * La respuesta correcta letra por letra, marcando las que no coinciden con lo escrito (alineadas
 * por la distancia de edición). Así "watr" → "water" marca la "e" que falta.
 */
export function diffAgainst(input: string, target: string): LetterDiff[] {
  const a = normalizeTyped(input)
  const b = target
  const lower = b.toLowerCase()
  // Sin transposiciones: la alineación letra a letra necesita solo sustituir, insertar o borrar.
  const d = distanceTable(a, lower, false)
  const ok = Array.from({ length: b.length }, () => false)
  let i = a.length
  let j = b.length
  while (i > 0 && j > 0) {
    if (a[i - 1] === lower[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      ok[j - 1] = true
      i--
      j--
    } else if (d[i][j] === d[i - 1][j - 1] + 1) {
      i--
      j--
    } else if (d[i][j] === d[i - 1][j] + 1) {
      i--
    } else {
      j--
    }
  }
  // Por unidades de texto, igual que la tabla (las palabras del vocabulario son ASCII).
  return Array.from({ length: b.length }, (_letter, position) => ({ position, char: b[position], ok: ok[position] }))
}
