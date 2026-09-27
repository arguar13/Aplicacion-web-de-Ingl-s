import { expect, test } from '@playwright/test'
import {
  answerCorrectly,
  currentWord,
  expectAccessible,
  expectNoHorizontalScroll,
  optionKey,
  storedProgress,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('el inicio se ve completo, sin desbordes y accesible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Escucha, piensa, pulsa.' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nivel 1 · Esenciales/ })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)
})

test('elegir un nivel, acertar y fallar', async ({ page }) => {
  await page.getByRole('button', { name: /Empieza aquí/ }).click()
  await expect(page).toHaveURL(/#\/nivel\/1$/)
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  const first = await answerCorrectly(page)
  await expect(page.getByRole('definition').filter({ hasText: /^1$/ }).first()).toBeVisible()

  // Una tecla equivocada se marca y el usuario puede seguir intentando.
  const word = await currentWord(page)
  const wrong = page
    .locator('main button[aria-keyshortcuts]')
    .filter({ hasNot: page.locator('span', { hasText: new RegExp(`^${word.es.replace(/[()]/g, '\\$&')}$`) }) })
    .first()
  await wrong.click()
  await expect(page.getByText('No es esa. Prueba otra.')).toBeVisible()
  await expect(wrong).toBeDisabled()
  await optionKey(page, word.es).first().click()
  await expect(page.getByText('Eso es.')).toBeVisible()

  // El progreso queda guardado con la versión del esquema.
  const progress = await storedProgress(page)
  expect(progress).toMatchObject({
    version: 1,
    cards: { [`en-es:${first.id}`]: { box: 2 }, [`en-es:${word.id}`]: { box: 1 } },
  })
})

test('se juega con el teclado', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Atajos de teclado: solo en escritorio')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/nivel\/1$/)
  const word = await currentWord(page)
  const keys = page.locator('main button[aria-keyshortcuts]')
  const labels = await keys.locator('span[lang="es"]').allTextContents()
  await page.keyboard.press(String(labels.indexOf(word.es) + 1))
  await expect(page.getByText('¡Correcto!')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#\/$/)
})
