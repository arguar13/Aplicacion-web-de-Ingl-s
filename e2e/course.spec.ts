import a1 from '../src/data/course/a1.json' with { type: 'json' }
import { solveAll, toExercise } from './courseHelpers'
import { expect, test } from './fixtures'
import { expectAccessible, expectNoHorizontalScroll } from './helpers'

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
