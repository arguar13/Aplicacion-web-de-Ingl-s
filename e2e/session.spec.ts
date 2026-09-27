import { expect, test } from './fixtures'
import {
  answerCorrectly,
  answerCurrent,
  answerManyCorrectly,
  expectAccessible,
  expectNoHorizontalScroll,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() =>
    localStorage.setItem('tecla:settings:v1', JSON.stringify({ dailyGoal: 10, detailsPause: 'never' })),
  )
  await page.reload()
})

test('al cumplir la meta del día aparece el resumen y se puede seguir', async ({ page }) => {
  await page.goto('./#/nivel/1')
  await answerManyCorrectly(page, 9)
  await answerCurrent(page)

  await expect(page.getByRole('heading', { name: '¡Meta cumplida!' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Meta de hoy' })).toHaveAttribute('aria-valuenow', '10')
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  await page.getByRole('button', { name: /Seguir practicando/ }).click()
  await expect(page.getByRole('group', { name: 'Respuestas' })).toBeVisible()
})

test('salir tras responder muestra el resumen y "Volver a los niveles" sale', async ({ page }) => {
  await page.goto('./#/nivel/2')
  await answerCorrectly(page)
  await page.getByRole('button', { name: 'Niveles' }).click()
  await expect(page.getByRole('heading', { name: 'Buen trabajo' })).toBeVisible()
  await page.getByRole('button', { name: /Volver a los niveles/ }).click()
  await expect(page).toHaveURL(/#\/$/)
})

test('salir sin haber respondido va directo a los niveles', async ({ page }) => {
  await page.goto('./#/nivel/2')
  await page.getByRole('button', { name: 'Niveles' }).click()
  await expect(page).toHaveURL(/#\/$/)
})
