import { readFile } from 'node:fs/promises'
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
