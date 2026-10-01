import { expect, test } from './fixtures'
import { answerCorrectly } from './helpers'

// Los atajos de teclado solo tienen sentido con teclado: en una pantalla táctil no se muestran.
test('los atajos de teclado se ven con ratón y nunca en una pantalla táctil', async ({ page }, testInfo) => {
  const touch = testInfo.project.use.hasTouch === true
  const shortcuts = page.locator('kbd:visible')

  await page.goto('./#/nivel/1')
  await answerCorrectly(page)
  if (touch) await expect(shortcuts).toHaveCount(0)
  else await expect(shortcuts.first()).toBeVisible()

  // El inicio con progreso tiene atajos en la tarjeta de continuar y en el repaso del día.
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Tu inglés, hoy.' })).toBeVisible()
  if (touch) await expect(shortcuts).toHaveCount(0)
  else await expect(shortcuts.filter({ hasText: 'Enter' })).toBeVisible()
})
