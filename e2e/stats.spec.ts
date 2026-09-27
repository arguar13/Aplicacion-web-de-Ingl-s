import { expect, test } from '@playwright/test'
import { answerManyCorrectly, expectAccessible, expectNoHorizontalScroll } from './helpers'

test('las estadísticas reflejan lo practicado y son accesibles', async ({ page }) => {
  await page.goto('./#/nivel/1')
  await page.evaluate(() => localStorage.setItem('tecla:settings:v1', JSON.stringify({ detailsPause: 'never' })))
  await page.reload()
  await answerManyCorrectly(page, 3)

  await page.goto('./')
  await page.getByRole('button', { name: 'Tu progreso' }).click()
  await expect(page).toHaveURL(/#\/estadisticas$/)
  await expect(page.getByRole('heading', { name: 'Tu progreso' })).toBeVisible()
  await expect(page.getByText('Respuestas').locator('..')).toContainText('3')
  await expect(
    page.getByRole('img', { name: /Actividad de las últimas 26 semanas: 1 días con práctica/ }),
  ).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)
})

test('la precisión se recorre con el teclado', async ({ page }) => {
  await page.goto('./#/estadisticas')
  const chart = page.getByRole('slider', { name: /Precisión de las últimas 8 semanas/ })
  await chart.focus()
  await expect(chart).toHaveAttribute('aria-valuenow', '7')
  await page.keyboard.press('ArrowLeft')
  await expect(chart).toHaveAttribute('aria-valuenow', '6')
  await expect(chart).toHaveAttribute('aria-valuetext', /Semana del .*sin práctica/)
})
