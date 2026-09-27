import { expect, test } from '@playwright/test'

test('el botón atrás vuelve a los niveles en vez de salir de la app', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Nivel 3 · Cotidiano|^3 Cotidiano/ }).click()
  await expect(page).toHaveURL(/#\/nivel\/3$/)
  await expect(page).toHaveTitle('Nivel 3 · Cotidiano — Tecla')

  await page.goBack()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { name: 'Escucha, piensa, pulsa.' })).toBeVisible()

  await page.goForward()
  await expect(page).toHaveURL(/#\/nivel\/3$/)
})

test('un enlace directo abre el nivel y "Niveles" no saca de la app', async ({ page }) => {
  await page.goto('./#/nivel/2')
  await expect(page.getByText('Nivel 2', { exact: false }).first()).toBeVisible()
  const entries = await page.evaluate(() => history.length)
  await page.getByRole('button', { name: 'Niveles' }).click()
  await expect(page).toHaveURL(/#\/$/)
  expect(await page.evaluate(() => history.length)).toBe(entries)
})

test('ajustes se abre como panel y atrás lo cierra sin salir de la partida', async ({ page }) => {
  await page.goto('./#/nivel/1')
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(page).toHaveURL(/#\/nivel\/1\?panel=ajustes$/)
  const dialog = page.getByRole('dialog', { name: 'Ajustes' })
  await expect(dialog).toBeVisible()

  await page.goBack()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/#\/nivel\/1$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'Ajustes' }).click()
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/#\/nivel\/1$/)
})

test('una ruta desconocida lleva al inicio', async ({ page }) => {
  await page.goto('./#/nivel/99')
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { name: 'Escucha, piensa, pulsa.' })).toBeVisible()
})
