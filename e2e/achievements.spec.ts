import { expect, test } from './fixtures'
import { answerCorrectly, expectAccessible } from './helpers'

test('la primera palabra desbloquea un logro, se anuncia y aparece en la vitrina', async ({ page }) => {
  await page.goto('./#/nivel/1')
  await answerCorrectly(page)
  const toast = page.getByRole('status').filter({ hasText: 'Logro desbloqueado' })
  await expect(toast).toContainText('Primera tecla')

  await page.goto('./#/estadisticas')
  await expect(page.getByText('1 de 13 conseguidos')).toBeVisible()
  await expect(page.getByText(/Conseguido el/)).toBeVisible()
  await expectAccessible(page)
})

test('quien ya tenía progreso no recibe una lluvia de avisos al actualizar', async ({ page }) => {
  // El progreso existe antes de la primera carga con logros, como en quien actualiza la app.
  await page.addInitScript(() => {
    if (localStorage.getItem('tecla:progress:v1')) return
    const d = new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem(
      'tecla:progress:v1',
      JSON.stringify({
        version: 2,
        cards: {},
        days: [key],
        history: { [key]: { answers: 50, clean: 50, fresh: 5, ms: 1 } },
      }),
    )
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Tu inglés, hoy.' })).toBeVisible()
  await expect(page.getByText(/logros? desbloqueados?/i)).toHaveCount(0)
})
