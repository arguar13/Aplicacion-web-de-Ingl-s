import { expect, test } from '@playwright/test'
import { answerCorrectly, expectNoHorizontalScroll } from './helpers'

// El móvil Android más estrecho habitual: 360 px, con progreso (la cabecera muestra estadísticas).
test.use({ viewport: { width: 360, height: 780 } })

test('a 360 px nada se sale de la pantalla, con progreso y meta superada', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => {
    const d = new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('tecla:settings:v1', JSON.stringify({ detailsPause: 'never' }))
    localStorage.setItem(
      'tecla:progress:v1',
      JSON.stringify({
        version: 2,
        cards: {},
        days: [key],
        history: { [key]: { answers: 120, clean: 100, fresh: 3, ms: 60_000 } },
        bestStreak: 0,
      }),
    )
  })
  await page.reload()
  await page
    .getByRole('button', { name: /Nivel 1/ })
    .first()
    .click()
  await answerCorrectly(page)
  await expectNoHorizontalScroll(page)

  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Tu progreso' })).toBeVisible()
  await expectNoHorizontalScroll(page)

  await page.goto('./#/estadisticas')
  await expect(page.getByRole('heading', { name: 'Tu progreso' })).toBeVisible()
  await expectNoHorizontalScroll(page)
})
