import { expect, test } from './fixtures'
import { currentWord, escapeRegExp, expectAccessible, expectNoHorizontalScroll, optionKey } from './helpers'

test('tras un fallo, la partida se detiene con el ejemplo de la palabra', async ({ page }) => {
  await page.goto('./#/nivel/1')
  const word = await currentWord(page)
  await page
    .getByRole('group', { name: 'Respuestas' })
    .getByRole('button')
    .filter({ hasNot: page.getByText(word.es, { exact: true }) })
    .first()
    .click()
  await optionKey(page, word.es).first().click()

  const card = page.getByRole('region', { name: new RegExp(escapeRegExp(word.es)) })
  await expect(card).toBeVisible()
  await expect(card.locator('blockquote mark')).toHaveText(new RegExp(`^${word.en}$`, 'i'))
  await expect(card.locator('figcaption')).not.toBeEmpty()
  // La pronunciación en IPA aparece bajo la palabra.
  await expect(page.getByText(/^\/.+\/$/).first()).toHaveText(/^\/.+\/$/)

  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  // No avanza solo: espera a que el usuario siga.
  await page.waitForTimeout(1500)
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: /Continuar/ }).click()
  await expect(card).toBeHidden()
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(word.en)
})

test('tras un acierto, "Ver ejemplo" detiene el avance', async ({ page, isMobile }) => {
  test.skip(isMobile, 'La tecla E es un atajo de escritorio; en móvil se prueba el toque en otro test')
  await page.goto('./#/nivel/1')
  const word = await currentWord(page)
  await optionKey(page, word.es).first().click()
  await page.keyboard.press('e')
  const card = page.getByRole('region', { name: new RegExp(escapeRegExp(word.es)) })
  await expect(card).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(card).toBeHidden()
})

test('con "Siempre", se detiene también tras un acierto', async ({ page }) => {
  await page.goto('./#/?panel=ajustes')
  await page.getByRole('dialog', { name: 'Ajustes' }).getByText('Siempre', { exact: true }).click()
  await page.goto('./#/nivel/2')
  const word = await currentWord(page)
  await optionKey(page, word.es).first().click()
  await expect(page.getByRole('button', { name: /Continuar/ })).toBeVisible()
  await page.getByRole('button', { name: /Continuar/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(word.en)
})
