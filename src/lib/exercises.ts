/**
 * Corrección de los ejercicios del curso. Lo escrito se compara con tolerancia: sin mayúsculas,
 * puntuación final ni espacios de más, apóstrofos rectos y, en frases largas, un error de tecleo
 * cuenta como «casi».
 */
import type { Exercise } from './course'
import { shuffle } from './quiz'
import { seededRng, stringSeed } from './seed'
import { editDistance, judgeTyped, normalizeTyped } from './typing'

export type Verdict = 'correct' | 'almost' | 'wrong'

/**
 * Lo que respondió el estudiante: el índice elegido, lo escrito, las palabras en el orden que las
 * puso o, en comprensión, la opción elegida en cada pregunta.
 */
export type Response = number | string | string[] | number[]

const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number')
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

/**
 * Comprensión: todas bien es correcto; con tres preguntas o más, una sola mal cuenta como «casi»
 * (se entendió el texto); si no, mal.
 */
export function judgeQuestions(questions: readonly { answer: number }[], chosen: readonly number[]): Verdict {
  const wrong = questions.filter((question, i) => chosen[i] !== question.answer).length
  if (wrong === 0) return 'correct'
  return wrong === 1 && questions.length >= 3 ? 'almost' : 'wrong'
}

/** Frase comparable: minúsculas, sin puntuación final ni espacios sobrantes, apóstrofos rectos. */
export function normalizeSentence(text: string): string {
  return normalizeTyped(text)
    .replace(/[.!?,;:]+$/g, '')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/[“”"]/g, '')
    .trim()
}

/**
 * Contracciones sin ambigüedad, desarrolladas: «should've» y «should have», «don't» y «do not» son la
 * misma respuesta. «'s» (is / has / posesivo) y «'d» (would / had) no se tocan: no se sabe cuál es.
 */
const CONTRACTIONS: ReadonlyArray<[RegExp, string]> = [
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
  [/'re\b/g, ' are'],
  [/\bi'm\b/g, 'i am'],
]

/** Frase normalizada y con las contracciones desarrolladas, para comparar respuestas escritas. */
export function comparableSentence(text: string): string {
  let out = normalizeSentence(text)
  for (const [pattern, full] of CONTRACTIONS) out = out.replace(pattern, full)
  return out.replace(/\s+/g, ' ')
}

/** Errores de tecleo que se perdonan en una frase según su longitud (uno cada 12 letras, hasta 2). */
const typosAllowed = (expected: string) => Math.min(2, Math.floor(expected.length / 12))

/** Compara una frase escrita con las respuestas válidas. */
export function judgeSentence(input: string, answers: readonly string[]): Verdict {
  const typed = comparableSentence(input)
  if (!typed) return 'wrong'
  let best: Verdict = 'wrong'
  for (const answer of answers) {
    const expected = comparableSentence(answer)
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
    case 'transform':
      return typeof response === 'string' ? judgeSentence(response, exercise.answers) : 'wrong'
    case 'spot':
      return response === exercise.answer ? 'correct' : 'wrong'
    case 'order':
      return isStrings(response) && response.join(' ') === exercise.words.join(' ') ? 'correct' : 'wrong'
    case 'reading':
    case 'listening':
      return isNumbers(response) ? judgeQuestions(exercise.questions, response) : 'wrong'
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
    case 'transform':
      return exercise.prompt.replace('___', exercise.answers[0])
    case 'spot':
      return correctedSentence(exercise)
    case 'order':
      return exercise.words.join(' ')
    case 'reading':
    case 'listening':
      return exercise.questions.map((question, i) => `${i + 1}. ${question.options[question.answer]}`).join(' · ')
  }
}

/**
 * Orden en que se muestran las opciones de una pregunta: barajado, pero siempre igual para la misma
 * pregunta (al volver a ella o al retomarla). Así la posición de la correcta no delata nada, la
 * escriba quien la escriba, y tampoco se aprende de memoria.
 */
export function optionOrder(options: readonly string[], question: string): number[] {
  return shuffle(
    options.map((_, i) => i),
    seededRng(stringSeed(`${question}|${options.join('|')}`)),
  )
}

/** La frase de «encuentra el error» ya corregida. */
export function correctedSentence(exercise: Extract<Exercise, { type: 'spot' }>): string {
  return exercise.parts.map((part, i) => (i === exercise.answer ? exercise.correction : part)).join(' ')
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

/** Destrezas que evalúa un examen, como en los exámenes oficiales. */
export type Skill = 'use' | 'writing' | 'reading' | 'listening'

const SKILLS: readonly Skill[] = ['use', 'writing', 'reading', 'listening']

export const SKILL_LABEL: Record<Skill, string> = {
  use: 'Gramática y uso',
  writing: 'Escritura',
  reading: 'Lectura',
  listening: 'Escucha',
}

const SKILL_OF: Record<Exercise['type'], Skill> = {
  choice: 'use',
  fill: 'use',
  spot: 'use',
  transform: 'use',
  order: 'writing',
  translate: 'writing',
  reading: 'reading',
  listening: 'listening',
}

export interface SkillScore {
  skill: Skill
  correct: number
  total: number
  ratio: number
}

/** Nota por destreza: dónde está fuerte y qué conviene repasar. Solo las destrezas que aparecen. */
export function skillBreakdown(exercises: readonly Exercise[], verdicts: readonly Verdict[]): SkillScore[] {
  const scores = new Map<Skill, { correct: number; total: number }>()
  for (const [i, exercise] of exercises.entries()) {
    const verdict = verdicts[i]
    if (verdict === undefined) continue
    const skill = SKILL_OF[exercise.type]
    const score = scores.get(skill) ?? { correct: 0, total: 0 }
    score.total++
    if (verdict !== 'wrong') score.correct++
    scores.set(skill, score)
  }
  return SKILLS.flatMap((skill) => {
    const score = scores.get(skill)
    return score ? [{ skill, ...score, ratio: score.correct / score.total }] : []
  })
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
