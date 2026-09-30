import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { answerCorrectly, currentWord, expectAccessible, expectNoHorizontalScroll, optionKey } from './helpers'

/** Responde bien hasta encontrar `id` (o agotar `rounds`); devuelve si volvió a salir. */
async function answerUntil(page: Page, id: string, rounds: number): Promise<boolean> {
  if (rounds === 0) return false
  if ((await currentWord(page)).id === id) return true
  await answerCorrectly(page)
  return answerUntil(page, id, rounds - 1)
}

test('la sesión inteligente se abre desde el inicio, vuelve a preguntar lo fallado y cuenta tu ritmo', async ({
  page,
}) => {
  test.slow()
  await page.goto('./')
  await page.getByRole('button', { name: /Sesión inteligente/ }).click()
  await expect(page).toHaveURL(/#\/sesion$/)
  await expect(page.getByText('Sesión inteligente')).toBeVisible()
  await expect(page.getByText('Nueva', { exact: true })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  // Se falla la primera palabra: vuelve a salir a las pocas rondas, marcada como "Otra vez".
  const failed = await currentWord(page)
  await page
    .getByRole('group', { name: 'Respuestas' })
    .getByRole('button')
    .filter({ hasNot: page.getByText(failed.es, { exact: true }) })
    .first()
    .click()
  await optionKey(page, failed.es).first().click()
  await page.getByRole('button', { name: /Continuar/ }).click()
  expect(await answerUntil(page, failed.id, 8)).toBe(true)
  await expect(page.getByText('Otra vez', { exact: true })).toBeVisible()

  // De vuelta al inicio: la tarjeta resume la práctica de hoy y el ritmo del entrenador.
  await page.getByRole('button', { name: 'Inicio' }).click()
  await page
    .getByRole('button', { name: /Terminar|Volver|Inicio/ })
    .first()
    .click()
  await expect(page.getByRole('button', { name: /Tu práctica de hoy/ })).toBeVisible()
  await expect(page.getByText(/Ritmo normal|Afianzando|Acelerando/)).toBeVisible()
})
