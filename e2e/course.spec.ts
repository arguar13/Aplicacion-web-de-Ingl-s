import type { Page } from '@playwright/test'
import a1 from '../src/data/course/a1.json' with { type: 'json' }
import { expect, test } from './fixtures'
import { expectAccessible, expectNoHorizontalScroll } from './helpers'

type Exercise =
  | { type: 'choice'; options: string[]; answer: number; explanation?: string }
  | { type: 'fill' | 'translate'; answers: string[] }
  | { type: 'order'; words: string[] }

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

/** Lee un ejercicio del JSON con la forma que necesita el test (sin aserciones de tipo). */
function toExercise(raw: unknown): Exercise {
  if (typeof raw !== 'object' || raw === null) throw new Error('Ejercicio sin forma')
  const entry: Record<string, unknown> = { ...raw }
  if (entry.type === 'choice' && isStrings(entry.options) && typeof entry.answer === 'number') {
    const explanation = typeof entry.explanation === 'string' ? { explanation: entry.explanation } : {}
    return { type: 'choice', options: entry.options, answer: entry.answer, ...explanation }
  }
  if ((entry.type === 'fill' || entry.type === 'translate') && isStrings(entry.answers)) {
    return { type: entry.type, answers: entry.answers }
  }
  if (entry.type === 'order' && isStrings(entry.words)) return { type: 'order', words: entry.words }
  throw new Error(`Ejercicio desconocido: ${JSON.stringify(raw)}`)
}

/** Toca las palabras disponibles en el orden indicado, una tras otra. */
async function placeWords(page: Page, words: readonly string[]): Promise<void> {
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
async function solve(page: Page, exercise: Exercise) {
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
async function solveAll(page: Page, exercises: readonly Exercise[]): Promise<void> {
  const [first, ...rest] = exercises
  if (!first) return
  await solve(page, first)
  return solveAll(page, rest)
}

const lesson = a1.lessons[0]

test('el curso lista los niveles, cada nivel sus lecciones, y una lección se lee y se practica', async ({ page }) => {
  test.slow()
  await page.goto('./')
  const card = page.getByRole('region', { name: /Curso de inglés/ })
  await expect(card).toContainText(`Nivel A1: lección 1, ${lesson.title}`)
  await card.getByRole('button', { name: 'Ver el curso' }).click()
  await expect(page).toHaveURL(/#\/curso$/)
  await expect(page.getByRole('heading', { name: 'Curso de inglés' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nivel A1/ })).toContainText(`0 de ${a1.lessons.length} lecciones`)
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  await page.getByRole('button', { name: /Nivel A1/ }).click()
  await expect(page).toHaveURL(/#\/curso\/a1$/)
  await expect(page.getByRole('heading', { name: 'Principiante' })).toBeVisible()
  await expect(page.getByText(`Lecciones · 0 de ${a1.lessons.length}`)).toBeVisible()
  await expectAccessible(page)

  await page.getByRole('button', { name: new RegExp(lesson.title) }).click()
  await expect(page).toHaveURL(new RegExp(`#/curso/a1/${lesson.id}$`))
  await expect(page.getByRole('heading', { name: lesson.sections[0].heading })).toBeVisible()
  await expect(page.getByText(lesson.sections[0].examples[0].en)).toBeVisible()
  await expectAccessible(page)

  await page.getByRole('button', { name: /Practicar/ }).click()
  await solveAll(page, lesson.exercises.map(toExercise))
  await expect(page.getByRole('heading', { name: '¡Lección completada!' })).toBeVisible()
  await expect(page.getByText('100 %')).toBeVisible()
  await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible()
  await expectAccessible(page)

  // Queda anotada: en el nivel y en el inicio.
  await page.getByRole('button', { name: 'Nivel A1' }).click()
  await expect(page.getByText(`Lecciones · 1 de ${a1.lessons.length}`)).toBeVisible()
  await expect(page.getByText('Mejor nota: 100 %')).toBeVisible()
  await page.goto('./')
  await expect(card).toContainText(`Nivel A1: lección 2, ${a1.lessons[1].title}`)
})

test('un ejercicio fallado muestra la respuesta correcta y la explicación', async ({ page }) => {
  await page.goto(`./#/curso/a1/${lesson.id}`)
  await page.getByRole('button', { name: /Practicar/ }).click()
  const first = toExercise(lesson.exercises[0])
  if (first.type !== 'choice') throw new Error('El primer ejercicio de la lección 1 debe ser de elegir')
  const wrong = first.options.findIndex((_, i) => i !== first.answer)
  await page
    .getByRole('group', { name: 'Opciones' })
    .getByRole('button', { name: first.options[wrong], exact: true })
    .click()
  await expect(page.getByText('No es así.')).toBeVisible()
  await expect(page.getByText(first.options[first.answer], { exact: true })).toBeVisible()
  if (first.explanation) await expect(page.getByText(first.explanation)).toBeVisible()
})

test('el examen del nivel se aprueba con el 80 % y queda anotado', async ({ page }) => {
  test.slow()
  await page.goto('./#/curso/a1/examen')
  await expect(page.getByRole('heading', { name: 'Examen del nivel' })).toBeVisible()
  await page.getByRole('button', { name: 'Empezar el examen' }).click()
  await solveAll(page, a1.exam.map(toExercise))
  await expect(page.getByRole('heading', { name: '¡Nivel A1 aprobado!' })).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('button', { name: /Volver al nivel/ }).click()
  await expect(page.getByText(/Aprobado con 100 %/)).toBeVisible()
  await page.goto('./#/curso')
  await expect(page.getByRole('button', { name: /Nivel A1/ })).toContainText('Aprobado')
  await page.goto('./')
  await expect(page.getByRole('region', { name: /Curso de inglés/ })).toContainText('1 de 6 niveles aprobados')
})
