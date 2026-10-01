import { expect, type Page } from '@playwright/test'

export type Exercise =
  | { type: 'choice'; prompt: string; options: string[]; answer: number; explanation?: string }
  | { type: 'fill'; prompt: string; answers: string[] }
  | { type: 'translate'; es: string; answers: string[] }
  | { type: 'order'; es: string; words: string[] }

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
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim()
/** Lo que se ve de un ejercicio en pantalla: la frase con el hueco (sin él) o la frase en español. */
const shownText = (exercise: Exercise) =>
  exercise.type === 'choice' || exercise.type === 'fill'
    ? squash(exercise.prompt.replace('___', ' '))
    : squash(exercise.es)

/** Reconoce el ejercicio que está en pantalla entre los del fondo, por su tipo y su enunciado. */
export async function shownExercise(page: Page, pool: readonly Exercise[]): Promise<Exercise> {
  const section = page.locator('section[aria-label*="ejercicio"]')
  const label = squash((await section.locator('span.uppercase').first().textContent()) ?? '')
  const type = TYPE_BY_LABEL[label]
  const prompt = squash((await section.locator('p[lang]').first().textContent()) ?? '')
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
