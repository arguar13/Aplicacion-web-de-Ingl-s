import a1 from '../src/data/course/a1.json' with { type: 'json' }
import { solveShown, toExercise } from './courseHelpers'
import { expect, test } from './fixtures'
import { expectAccessible } from './helpers'

const RAW: unknown[] = [...a1.lessons.flatMap((lesson): unknown[] => lesson.exercises), ...a1.exam]
const POOL = RAW.map(toExercise)

test('el quiz de un nivel trae diez preguntas al azar, se corrige y guarda la mejor nota', async ({ page }) => {
  test.slow()
  await page.goto('./#/curso/a1')
  await page.getByRole('button', { name: /Quiz rápido/ }).click()
  await expect(page).toHaveURL(/#\/curso\/a1\/quiz$/)
  await expect(page.getByRole('heading', { name: 'Quiz A1' })).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('button', { name: /Empezar el quiz/ }).click()
  await solveShown(page, POOL, 10)
  await expect(page.getByRole('heading', { name: '¡Quiz perfecto!' })).toBeVisible()
  await expect(page.getByText('100 %')).toBeVisible()
  // Otro quiz: vuelve a empezar con preguntas (muy probablemente) distintas; la nota queda guardada.
  await page.getByRole('button', { name: /Otro quiz/ }).click()
  await expect(page.locator('section[aria-label*="ejercicio 1 de 10"]')).toBeVisible()
  await page.goto('./#/curso/a1')
  await expect(page.getByRole('button', { name: /Quiz rápido/ })).toContainText('100 %')
})

test('el quiz mixto reúne preguntas de todos los niveles', async ({ page }) => {
  await page.goto('./#/curso')
  await page.getByRole('button', { name: /Quiz mixto/ }).click()
  await expect(page).toHaveURL(/#\/curso\/quiz$/)
  await expect(page.getByText(/12 preguntas al azar de todos los niveles/)).toBeVisible()
  await page.getByRole('button', { name: /Empezar el quiz/ }).click()
  await expect(page.locator('section[aria-label*="Quiz mixto: ejercicio 1 de 12"]')).toBeVisible()
})
