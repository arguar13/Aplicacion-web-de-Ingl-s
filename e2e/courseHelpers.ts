import { expect, type Page } from '@playwright/test'

export type Exercise =
  | { type: 'choice'; prompt: string; options: string[]; answer: number; explanation?: string }
  | { type: 'fill'; prompt: string; answers: string[] }
  | { type: 'translate'; es: string; answers: string[] }
  | { type: 'order'; es: string; words: string[] }
  | ({ type: 'reading' } & Passage)
  | ({ type: 'listening' } & Passage)

/** Un texto de comprensión (lectora o auditiva) con sus preguntas. */
interface Passage {
  title: string
  questions: Array<{ options: string[]; answer: number }>
}

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

/** Lee un ejercicio del JSON con la forma que necesita el test (sin aserciones de tipo). */
export function toExercise(raw: unknown): Exercise {
  if (typeof raw !== 'object' || raw === null) throw new Error('Ejercicio sin forma')
  const entry: Record<string, unknown> = { ...raw }
  const text = (key: string) => {
    const value = entry[key]
    return typeof value === 'string' ? value : ''
  }
  if (entry.type === 'choice' && isStrings(entry.options) && typeof entry.answer === 'number') {
    const explanation = typeof entry.explanation === 'string' ? { explanation: entry.explanation } : {}
    return { type: 'choice', prompt: text('prompt'), options: entry.options, answer: entry.answer, ...explanation }
  }
  if (entry.type === 'fill' && isStrings(entry.answers))
    return { type: 'fill', prompt: text('prompt'), answers: entry.answers }
  if (entry.type === 'translate' && isStrings(entry.answers))
    return { type: 'translate', es: text('es'), answers: entry.answers }
  if (entry.type === 'order' && isStrings(entry.words)) return { type: 'order', es: text('es'), words: entry.words }
  if ((entry.type === 'reading' || entry.type === 'listening') && Array.isArray(entry.questions)) {
    const questions = entry.questions.map((question: unknown) => {
      if (typeof question !== 'object' || question === null) throw new Error('Pregunta sin forma')
      const q: Record<string, unknown> = { ...question }
      if (!isStrings(q.options) || typeof q.answer !== 'number') throw new Error('Pregunta sin forma')
      return { options: q.options, answer: q.answer }
    })
    return entry.type === 'reading'
      ? { type: 'reading', title: text('title'), questions }
      : { type: 'listening', title: text('title'), questions }
  }
  throw new Error(`Ejercicio desconocido: ${JSON.stringify(raw)}`)
}

/** Toca las palabras disponibles en el orden indicado, una tras otra. */
export async function placeWords(page: Page, words: readonly string[]): Promise<void> {
  const [word, ...rest] = words
  if (word === undefined) return
  await page
    .getByRole('group', { name: 'Palabras disponibles' })
    .getByRole('button', { name: word, exact: true })
    .first()
    .click()
  return placeWords(page, rest)
}

/** Elige la opción correcta de cada pregunta de comprensión, una tras otra. */
async function answerQuestions(
  page: Page,
  questions: ReadonlyArray<{ options: string[]; answer: number }>,
  index = 0,
): Promise<void> {
  const question = questions[index]
  if (!question) return
  await page
    .getByRole('group', { name: `Pregunta ${index + 1}` })
    .getByRole('button', { name: question.options[question.answer], exact: true })
    .click()
  return answerQuestions(page, questions, index + 1)
}

/** Resuelve el ejercicio en pantalla con su respuesta correcta y pasa al siguiente. */
export async function solve(page: Page, exercise: Exercise) {
  switch (exercise.type) {
    case 'choice':
      await page
        .getByRole('group', { name: 'Opciones' })
        .getByRole('button', { name: exercise.options[exercise.answer], exact: true })
        .click()
      break
    case 'fill':
    case 'translate': {
      const input = page.getByRole('textbox')
      await input.fill(exercise.answers[0])
      await input.press('Enter')
      break
    }
    case 'order':
      await placeWords(page, exercise.words)
      await page.getByRole('button', { name: /Comprobar/ }).click()
      break
    case 'reading':
    case 'listening':
      await answerQuestions(page, exercise.questions)
      await page.getByRole('button', { name: /Comprobar/ }).click()
      break
  }
  await expect(page.getByText('¡Correcto!')).toBeVisible()
  await page.getByRole('button', { name: /Continuar|Ver el resultado/ }).click()
}

/** Resuelve todos los ejercicios, uno tras otro (cada uno espera al anterior). */
export async function solveAll(page: Page, exercises: readonly Exercise[]): Promise<void> {
  const [first, ...rest] = exercises
  if (!first) return
  await solve(page, first)
  return solveAll(page, rest)
}

const TYPE_BY_LABEL: Record<string, Exercise['type']> = {
  'Elige la opción correcta': 'choice',
  'Completa el hueco': 'fill',
  'Ordena las palabras': 'order',
  'Traduce al inglés': 'translate',
  'Comprensión lectora': 'reading',
  'Comprensión auditiva': 'listening',
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim()
/** Lo que se ve de un ejercicio en pantalla: la frase con el hueco (sin él) o la frase en español. */
const shownText = (exercise: Exercise) =>
  exercise.type === 'choice' || exercise.type === 'fill'
    ? squash(exercise.prompt.replace('___', ' '))
    : exercise.type === 'reading' || exercise.type === 'listening'
      ? squash(exercise.title)
      : squash(exercise.es)

/** Reconoce el ejercicio que está en pantalla entre los del fondo, por su tipo y su enunciado. */
export async function shownExercise(page: Page, pool: readonly Exercise[]): Promise<Exercise> {
  const section = page.locator('section[aria-label*="ejercicio"]')
  const label = squash((await section.locator('span.uppercase').first().textContent()) ?? '')
  const type = TYPE_BY_LABEL[label]
  const prompt = squash((await section.locator('p[lang], h3[lang]').first().textContent()) ?? '')
  const found = pool.find((exercise) => exercise.type === type && shownText(exercise) === prompt)
  if (!found) throw new Error(`Ejercicio no reconocido: ${label} · ${prompt}`)
  return found
}

/** Resuelve los `count` ejercicios que vayan apareciendo, reconociendo cada uno en el fondo. */
export async function solveShown(page: Page, pool: readonly Exercise[], count: number): Promise<void> {
  if (count <= 0) return
  await solve(page, await shownExercise(page, pool))
  return solveShown(page, pool, count - 1)
}
