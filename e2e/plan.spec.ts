import { expect, test } from './fixtures'
import { expectAccessible, expectNoHorizontalScroll } from './helpers'

test('crear un plan: objetivo, niveles y tiempo; el inicio muestra las tareas de hoy', async ({ page }) => {
  test.slow()
  await page.goto('./')
  const invite = page.getByRole('region', { name: /Tu plan personalizado/ })
  await invite.getByRole('button', { name: 'Crear mi plan' }).click()
  await expect(page).toHaveURL(/#\/plan$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Crea tu plan' })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  await page.getByRole('button', { name: /Viajar con confianza/ }).click()
  await expect(page.getByRole('heading', { name: '¿Desde dónde y hasta dónde?' })).toBeVisible()
  // El programa propone de A1 a B1.
  await expect(
    page.getByRole('group', { name: 'Quiero llegar a' }).getByRole('button', { name: /B1/ }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Siguiente' }).click()

  await page.getByRole('group', { name: 'Minutos al día' }).getByRole('button', { name: '30 min' }).click()
  await page.getByRole('group', { name: 'Días por semana' }).getByRole('button', { name: '4' }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()

  await expect(page.getByRole('heading', { name: 'Tu plan: Viajar con confianza' })).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Empezar mi plan' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Viajar con confianza' })).toBeVisible()
  await expect(page.getByText(/^1 de \d+$/).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Hoy' })).toContainText('Vocabulario')
  await expect(page.getByRole('region', { name: 'Hoy' })).toContainText('El verbo to be')
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  // En el inicio, el plan con sus tareas; una tarea lleva a su lección.
  await page.getByRole('button', { name: 'Inicio' }).click()
  const card = page.getByRole('region', { name: 'Viajar con confianza' })
  await expect(card).toContainText('Semana 1 de')
  await expect(card).toContainText('Hoy toca')
  await card.getByRole('button', { name: /Lección: El verbo to be/ }).click()
  await expect(page).toHaveURL(/#\/curso\/a1\//)
})

test('el plan se puede cambiar y dejar', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('tecla:plan')) return
    const plan = { program: 'work', from: 'a2', to: 'b2', minutes: 20, days: 5, startedAt: Date.now() }
    localStorage.setItem('tecla:plan', JSON.stringify({ version: 1, plan }))
  })
  await page.goto('./#/plan')
  await expect(page.getByRole('heading', { level: 1, name: 'Inglés para el trabajo' })).toBeVisible()
  await page.getByRole('button', { name: 'Cambiar el plan' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Cambia tu plan' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByRole('button', { name: 'Dejar el plan' }).click()
  await page.getByRole('button', { name: 'Sí, dejar el plan' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Crea tu plan' })).toBeVisible()
})
