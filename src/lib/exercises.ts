/**
 * Corrección de los ejercicios del curso. Lo escrito se compara con tolerancia: sin mayúsculas,
 * puntuación final ni espacios de más, apóstrofos rectos y, en frases largas, un error de tecleo
 * cuenta como «casi».
 */
import type { Exercise } from './course'
import { shuffle } from './quiz'
import { seededRng } from './seed'
import { editDistance, judgeTyped, normalizeTyped } from './typing'

export type Verdict = 'correct' | 'almost' | 'wrong'

/** Lo que respondió el estudiante: el índice elegido, lo escrito o las palabras en el orden que las puso. */
export type Response = number | string | string[]

/** Frase comparable: minúsculas, sin puntuación final ni espacios sobrantes, apóstrofos rectos. */
export function normalizeSentence(text: string): string {
  return normalizeTyped(text)
    .replace(/[.!?,;:]+$/g, '')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/[“”"]/g, '')
    .trim()
}

/** Errores de tecleo que se perdonan en una frase según su longitud (uno cada 12 letras, hasta 2). */
const typosAllowed = (expected: string) => Math.min(2, Math.floor(expected.length / 12))

/** Compara una frase escrita con las respuestas válidas. */
export function judgeSentence(input: string, answers: readonly string[]): Verdict {
  const typed = normalizeSentence(input)
  if (!typed) return 'wrong'
  let best: Verdict = 'wrong'
  for (const answer of answers) {
    const expected = normalizeSentence(answer)
    if (typed === expected) return 'correct'
    const allowed = typosAllowed(expected)
    if (allowed > 0 && editDistance(typed, expected) <= allowed) best = 'almost'
  }
  return best
}

/** Compara lo escrito en un hueco: una o dos palabras, con la tolerancia de escribir. */
export function judgeFill(input: string, answers: readonly string[]): Verdict {
  let best: Verdict = 'wrong'
  for (const answer of answers) {
    const verdict = judgeTyped(input, answer)
    if (verdict === 'exact') return 'correct'
    if (verdict === 'almost') best = 'almost'
  }
  return best
}

export function judgeExercise(exercise: Exercise, response: Response): Verdict {
  switch (exercise.type) {
    case 'choice':
      return response === exercise.answer ? 'correct' : 'wrong'
    case 'fill':
      return typeof response === 'string' ? judgeFill(response, exercise.answers) : 'wrong'
    case 'translate':
      return typeof response === 'string' ? judgeSentence(response, exercise.answers) : 'wrong'
    case 'order':
      return Array.isArray(response) && response.join(' ') === exercise.words.join(' ') ? 'correct' : 'wrong'
  }
}

/** La respuesta correcta tal como se muestra al corregir. */
export function correctAnswer(exercise: Exercise): string {
  switch (exercise.type) {
    case 'choice':
      return exercise.options[exercise.answer]
    case 'fill':
      return exercise.prompt.replace('___', exercise.answers[0])
    case 'translate':
      return exercise.answers[0]
    case 'order':
      return exercise.words.join(' ')
  }
}

/**
 * Las palabras de un ejercicio de ordenar, barajadas de forma estable (misma baraja cada vez que se
 * abre el ejercicio) y nunca ya en el orden correcto.
 */
export function shuffledWords(words: readonly string[], seed: number): string[] {
  const rng = seededRng(seed)
  let out = shuffle(words, rng)
  for (let attempt = 0; attempt < 10 && out.join(' ') === words.join(' '); attempt++) out = shuffle(words, rng)
  if (out.join(' ') === words.join(' ')) out = [...words.slice(1), words[0]]
  return out
}

export interface Score {
  correct: number
  /** Con un error de tecleo: cuentan como acierto, y se avisa. */
  almost: number
  total: number
  /** Acierto 0–1 (los «casi» cuentan). */
  ratio: number
}

export function scoreOf(verdicts: readonly Verdict[]): Score {
  const correct = verdicts.filter((v) => v === 'correct').length
  const almost = verdicts.filter((v) => v === 'almost').length
  const total = verdicts.length
  return { correct, almost, total, ratio: total ? (correct + almost) / total : 0 }
}
