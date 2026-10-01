import { expect, test } from './fixtures'
import { answerCorrectly, expectAccessible, expectNoHorizontalScroll, storedProgress } from './helpers'

test('las misiones del día y el rango están en el inicio y avanzan al practicar', async ({ page }) => {
  await page.goto('./')
  const card = page.getByRole('region', { name: 'Misiones de hoy' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('0 de 3 cumplidas')
  await expect(card).toContainText('Novato')
  await expect(card).toContainText('0 XP')
  await expect(card.getByRole('listitem')).toHaveCount(3)
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  await page.goto('./#/nivel/1')
  await answerCorrectly(page)
  await page.getByRole('button', { name: 'Niveles' }).click()
  // El resumen de la sesión muestra la experiencia ganada.
  await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible()
  await page.getByRole('button', { name: /Volver a los niveles/ }).click()
  await expect(card).toContainText('30 XP')
})

test('una misión cumplida se anuncia y suma su experiencia una sola vez', async ({ page }) => {
  // Se simula un día con casi todo hecho: la primera respuesta cumple lo que falte.
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
        history: { [key]: { answers: 59, clean: 59, fresh: 9, ms: 10 * 60_000 } },
        bestStreak: 0,
        xp: 0,
      }),
    )
  })
  await page.reload()
  const card = page.getByRole('region', { name: 'Misiones de hoy' })
  // Al arrancar ya se premian las que estaban cumplidas (si alguna del día lo estaba).
  const before = Number(/(\d+) XP/.exec((await card.textContent()) ?? '')?.[1])
  await page.goto('./#/nivel/1')
  await answerCorrectly(page)
  await page.goto('./')
  const after = Number(/(\d+) XP/.exec((await card.textContent()) ?? '')?.[1])
  expect(after).toBeGreaterThanOrEqual(before + 30)
  // Recargar no vuelve a premiar nada.
  const stored = await storedProgress(page)
  const xp = typeof stored === 'object' && stored !== null && 'xp' in stored ? Number(stored.xp) : Number.NaN
  expect(xp).toBe(after)
  await page.reload()
  await expect(card).toContainText(`${xp.toLocaleString('es')} XP`)
})
