import { expect, test } from './fixtures'
import { expectAccessible } from './helpers'

test('un protector cuida el día sin práctica y el inicio avisa de que la racha espera', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('tecla:progress:v1')) return
    // Hace 4, 3 y 2 días (ayer, sin práctica).
    const days = [-4, -3, -2].map((offset) => {
      const d = new Date(Date.now() + offset * 86_400_000)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    localStorage.setItem('tecla:progress:v1', JSON.stringify({ version: 2, cards: {}, days, freezes: 1, history: {} }))
  })
  await page.goto('./')
  const banner = page.getByRole('complementary', { name: /Tu racha de 4 días te espera/ })
  await expect(banner).toContainText('Ayer un protector la cuidó')
  await expectAccessible(page)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tecla:progress:v1') ?? '{}'))
  expect(saved.freezes).toBe(0)
  expect(saved.frozenDays).toHaveLength(1)
})
