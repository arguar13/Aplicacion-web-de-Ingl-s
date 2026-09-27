import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { answerCorrectly, expectAccessible, expectNoHorizontalScroll, storedProgress } from './helpers'

test('el tema elegido se aplica y se recuerda', async ({ page }) => {
  await page.goto('./#/?panel=ajustes')
  const dialog = page.getByRole('dialog', { name: 'Ajustes' })
  await dialog.getByText('Oscuro', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)
})

test('guardar una copia, borrar el progreso y restaurarlo', async ({ page }) => {
  await page.goto('./#/nivel/1')
  const word = await answerCorrectly(page)
  const before = await storedProgress(page)

  await page.getByRole('button', { name: 'Ajustes' }).click()
  const dialog = page.getByRole('dialog', { name: 'Ajustes' })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Guardar copia' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^tecla-copia-\d{4}-\d{2}-\d{2}\.json$/)
  await expect(dialog.getByText('Última copia: hoy.')).toBeVisible()
  const file = await download.path()

  await dialog.getByRole('button', { name: 'Borrar', exact: true }).click()
  await dialog.getByRole('button', { name: 'Sí, borrar' }).click()
  expect(await storedProgress(page)).toMatchObject({ cards: {} })

  await dialog.locator('input[type="file"]').setInputFiles(file)
  await expect(dialog.getByText('1 palabra practicada')).toBeVisible()
  await dialog.getByRole('button', { name: 'Reemplazar' }).click()
  await expect(dialog.getByText('Listo: tu progreso es el de la copia.')).toBeVisible()
  expect(await storedProgress(page)).toEqual(before)
  expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({
    format: 'tecla-copia',
    progress: { cards: { [`en-es:${word.id}`]: {} } },
  })
})

declare global {
  interface Window {
    /** Archivos que recibió la hoja de compartir simulada. */
    sharedFiles?: Array<{ name: string; text: string }>
  }
}

/** Todo lo que viaja en una copia, tal como está guardado. */
const stored = (target: Page) =>
  target.evaluate(() =>
    ['tecla:progress:v1', 'tecla:events', 'tecla:achievements'].map(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null') as unknown,
    ),
  )

test('una copia pasa el progreso a otro dispositivo, desde su bienvenida y sin repetir logros', async ({
  page,
  browser,
}, testInfo) => {
  // Dispositivo de siempre: practica (consigue su primer logro) y guarda una copia.
  await page.goto('./#/nivel/1')
  await answerCorrectly(page)
  await page.goto('./#/?panel=ajustes')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('dialog', { name: 'Ajustes' }).getByRole('button', { name: 'Guardar copia' }).click(),
  ])
  const file = await download.path()
  const original = await stored(page)

  // Dispositivo nuevo: sin datos, empieza en la bienvenida.
  const { baseURL, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = testInfo.project.use
  const context = await browser.newContext({ baseURL, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch })
  const other = await context.newPage()
  await other.goto('./')
  await expect(other.getByRole('heading', { name: /Inglés, tecla a tecla/ })).toBeVisible()
  await expect(other.getByRole('button', { name: 'Restaura tu copia' })).toBeVisible()
  await other.locator('input[type="file"]').setInputFiles(file)

  await expect(other.getByRole('heading', { name: 'Sigue donde lo dejaste' })).toBeVisible()
  await expect(other.getByText('1 palabra practicada')).toBeVisible()
  await expectAccessible(other)
  await other.getByRole('button', { name: 'Restaurar', exact: true }).click()

  await expect(other.getByRole('heading', { name: 'Escucha, piensa, pulsa.' })).toBeVisible()
  expect(await stored(other)).toEqual(original)
  await expect(other.getByRole('status').filter({ hasText: 'Logro desbloqueado' })).toHaveCount(0)
  await context.close()
})

test('donde el sistema comparte archivos, la copia se envía con su hoja de compartir', async ({ page }) => {
  // La hoja de compartir es del sistema operativo: se simula y se captura lo que recibe.
  await page.addInitScript(() => {
    window.sharedFiles = []
    navigator.canShare = () => true
    navigator.share = async (data) => {
      const files = await Promise.all(
        (data?.files ?? []).map(async (file) => ({ name: file.name, text: await file.text() })),
      )
      window.sharedFiles?.push(...files)
    }
  })
  await page.goto('./#/nivel/1')
  const word = await answerCorrectly(page)
  await page.goto('./#/?panel=ajustes')
  const dialog = page.getByRole('dialog', { name: 'Ajustes' })
  await expect(dialog.getByText('Aún no guardaste ninguna copia.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Enviar copia' }).click()
  await expect(dialog.getByText('Última copia: hoy.')).toBeVisible()

  const [file] = await page.evaluate(() => window.sharedFiles ?? [])
  expect(file.name).toMatch(/^tecla-copia-\d{4}-\d{2}-\d{2}\.json$/)
  expect(JSON.parse(file.text)).toMatchObject({
    format: 'tecla-copia',
    progress: { cards: { [`en-es:${word.id}`]: {} } },
  })
})

test('en la bienvenida, un archivo que no es una copia se explica y no avanza', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL })
  const page = await context.newPage()
  await page.goto('./')
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'otra.json', mimeType: 'application/json', buffer: Buffer.from('{"hola": 1}') })
  await expect(page.getByRole('alert')).toHaveText('Este archivo no es una copia de Tecla.')
  await expect(page.getByRole('heading', { name: /Inglés, tecla a tecla/ })).toBeVisible()
  await context.close()
})

test('un archivo que no es una copia muestra un error y no toca el progreso', async ({ page }) => {
  await page.goto('./#/?panel=ajustes')
  const dialog = page.getByRole('dialog', { name: 'Ajustes' })
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: 'otra.json', mimeType: 'application/json', buffer: Buffer.from('{"hola": 1}') })
  await expect(dialog.getByRole('alert')).toHaveText('Este archivo no es una copia de Tecla.')
  expect(await storedProgress(page)).toBeNull()
})

test('un progreso guardado dañado no rompe la app', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tecla:progress:v1', '{"cards": {"en-es:the": '))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Escucha, piensa, pulsa.' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('tecla:progress:v1:respaldo'))).toBe('{"cards": {"en-es:the": ')
})

test('el recordatorio diario se añade al calendario con un evento recurrente', async ({ page }) => {
  await page.goto('./#/?panel=ajustes')
  const dialog = page.getByRole('dialog', { name: 'Ajustes' })
  await dialog.getByLabel('Hora del recordatorio').fill('21:30')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Añadir al calendario' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('tecla-recordatorio.ics')
  const ics = await readFile(await download.path(), 'utf8')
  expect(ics).toContain('RRULE:FREQ=DAILY')
  expect(ics).toMatch(/DTSTART:\d{8}T213000/)
  await expect(dialog.getByText(/aviso de las 21:30/)).toBeVisible()
})
