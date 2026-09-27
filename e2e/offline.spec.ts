import { expect, test } from '@playwright/test'
import { answerCorrectly } from './helpers'

test('funciona sin conexión tras la primera visita', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright no simula el modo sin conexión con service worker en WebKit')
  await page.goto('./')
  // Con clientsClaim, el service worker controla la página ya en la primera visita.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

  await page.goto('./#/?panel=ajustes')
  await expect(page.getByText('Audio sin conexión')).toBeVisible()

  await context.setOffline(true)
  await page.goto('./#/nivel/1')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page).toHaveTitle('Nivel 1 · Esenciales — Tecla')
})

test('las pronunciaciones se piden con la versión de su contenido', async ({ page }) => {
  await page.goto('./#/nivel/1')
  // Al acertar, la app precarga el audio de la siguiente palabra (en cualquier navegador).
  const request = page.waitForRequest((r) => r.url().includes('/audio/'))
  await answerCorrectly(page)
  expect((await request).url()).toMatch(/\/audio\/[a-z0-9-]+\.mp3\?v=[0-9a-f]{8}$/)
})
