import { expect, test } from './fixtures'
import { expectAccessible } from './helpers'

test('«?» abre la lista de atajos sobre cualquier pantalla y el botón atrás la cierra', async ({ page }) => {
  await page.goto('./#/nivel/1')
  // La app monta cuando llega el vocabulario: hasta entonces no hay quien escuche el teclado.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('?')
  const sheet = page.getByRole('dialog', { name: 'Atajos de teclado' })
  await expect(sheet).toBeVisible()
  await expect(page).toHaveURL(/#\/nivel\/1\?panel=atajos$/)
  await expect(sheet.getByText('Calificarte: otra vez, difícil, bien, fácil')).toBeVisible()
  await expectAccessible(page)
  await page.goBack()
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(/#\/nivel\/1$/)
  // Y por enlace directo, con Esc para cerrar.
  await page.goto('./#/?panel=atajos')
  await expect(sheet).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
})
