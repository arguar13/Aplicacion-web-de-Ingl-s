import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import details from '../src/data/details.json' with { type: 'json' }
import words from '../src/data/words.json' with { type: 'json' }
import { expectAccessible, expectNoHorizontalScroll, optionKey } from './helpers'

const byId = new Map(words.map((w) => [w.id, w]))
const byEs = new Map(words.map((w) => [w.es, w]))
const byEn = new Map(words.map((w) => [w.en, w]))
const byEnglish = (text: string | null) => byEn.get(text?.trim() ?? '')
const examples: Record<string, { example?: { en: string } }> = details

async function useMode(page: Page, mode: string) {
  await page.goto('./')
  await page.evaluate(
    (value) => localStorage.setItem('tecla:settings:v1', JSON.stringify({ mode: value, detailsPause: 'never' })),
    mode,
  )
  await page.reload()
}

test('el selector de modo cambia cómo se practica y se recuerda', async ({ page }) => {
  await page.goto('./')
  const picker = page.getByRole('group', { name: 'Cómo practicar' })
  await picker.getByText('Escribir', { exact: true }).click()
  await expect(picker.getByRole('radio', { name: /Escribir/ })).toBeChecked()
  await page.reload()
  await expect(page.getByRole('radio', { name: /Escribir/ })).toBeChecked()
  await expectNoHorizontalScroll(page)
})

test('escuchar: suena la palabra sin mostrarla y se elige su traducción', async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit' && process.platform === 'win32',
    'El WebKit de Playwright para Windows no tiene audio: no pide el MP3 (Safari real y WebKit en Linux sí)',
  )
  await useMode(page, 'listen')
  const request = page.waitForRequest((r) => r.url().includes('/audio/'))
  await page.goto('./#/nivel/1')
  await expect(page.getByRole('heading', { name: 'Escucha la palabra' })).toBeAttached()
  await expectAccessible(page)
  const id = /\/audio\/([a-z0-9-]+)\.mp3/.exec((await request).url())?.[1] ?? ''
  const word = byId.get(id)
  expect(word).toBeDefined()
  await optionKey(page, word?.es ?? '')
    .first()
    .click()
  // Al acertar, la palabra aparece.
  await expect(page.getByRole('heading', { level: 1, name: word?.en })).toBeVisible()
})

test('escribir: exacta, "casi" con la corrección, e incorrecta con la respuesta', async ({ page }) => {
  await useMode(page, 'type')
  await page.goto('./#/nivel/2')
  const input = page.getByLabel('La palabra en inglés')
  const heading = page.getByRole('heading', { level: 1 })

  const first = byEs.get((await heading.textContent())?.trim() ?? '')
  await input.fill(first?.en ?? '')
  await input.press('Enter')
  await expect(page.getByText('¡Correcto!')).toBeVisible()
  await expect(heading).not.toHaveText(first?.es ?? '', { timeout: 3000 })

  const second = byEs.get((await heading.textContent())?.trim() ?? '')
  await page.getByLabel('La palabra en inglés').fill('zzzz')
  await page.getByRole('button', { name: /Comprobar/ }).click()
  await expect(page.getByText('No era esa.')).toBeVisible()
  await expect(page.getByText(/^Era /)).toContainText(second?.en ?? '')
  await expectAccessible(page)
})

test('completar: se elige la palabra que falta en la frase de ejemplo', async ({ page }) => {
  await useMode(page, 'cloze')
  await page.goto('./#/nivel/1')
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toContainText(/\w/)
  const sentence = ((await heading.textContent()) ?? '').replace(/\s+/g, ' ').trim()
  const labels = await page.getByRole('group', { name: 'Respuestas' }).getByRole('button').allTextContents()
  // La opción correcta es la palabra cuyo ejemplo, sin ella, es la frase mostrada.
  const answer = words.find((w) => {
    const example = examples[w.id]?.example?.en
    if (!example || !labels.some((label) => label.endsWith(w.en))) return false
    const index = example.toLowerCase().indexOf(w.en.toLowerCase())
    const without = `${example.slice(0, index)}${example.slice(index + w.en.length)}`
    return without.replace(/\s+/g, ' ').trim() === sentence
  })
  expect(answer).toBeDefined()
  await optionKey(page, answer?.en ?? '')
    .first()
    .click()
  await expect(heading.locator('mark')).toHaveText(new RegExp(`^${answer?.en}$`, 'i'))
})

test('tarjetas: se piensa, se muestra la traducción y uno se califica con las notas del repaso', async ({ page }) => {
  await useMode(page, 'flash')
  await page.goto('./#/nivel/1')
  const heading = page.getByRole('heading', { level: 1 })
  const word = byEnglish(await heading.textContent())
  // Antes de mostrar no hay teclas: solo pensar.
  await expect(page.getByRole('group', { name: 'Respuestas' })).toHaveCount(0)
  await page.getByRole('button', { name: /Mostrar la traducción/ }).click()
  const ratings = page.getByRole('group', { name: 'Qué tal te salió' })
  await expect(ratings.getByText(word?.es ?? '—')).toHaveCount(0)
  await expect(page.getByText(word?.es ?? '—', { exact: true })).toBeVisible()
  await expect(ratings.getByRole('button')).toHaveCount(4)
  // Cada nota dice cuándo volvería la palabra.
  await expect(ratings.getByRole('button', { name: /Otra vez/ })).toContainText(/min|h|d/)
  await expectAccessible(page)
  await ratings.getByRole('button', { name: /Fácil/ }).click()
  await expect(page.getByText('¡Fácil! Se aleja más.')).toBeVisible()
  await expect(heading).not.toHaveText(word?.en ?? '', { timeout: 3000 })
})

test('dictado: suena la palabra sin mostrarla y se escribe', async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit' && process.platform === 'win32',
    'El WebKit de Playwright para Windows no tiene audio: no pide el MP3 (Safari real y WebKit en Linux sí)',
  )
  await useMode(page, 'dictation')
  const request = page.waitForRequest((r) => r.url().includes('/audio/'))
  await page.goto('./#/nivel/1')
  await expect(page.getByRole('heading', { name: 'Escucha la palabra' })).toBeAttached()
  const id = /\/audio\/([a-z0-9-]+)\.mp3/.exec((await request).url())?.[1] ?? ''
  const word = byId.get(id)
  expect(word).toBeDefined()
  const input = page.getByLabel('La palabra que oíste')
  await input.fill(word?.en ?? '')
  await input.press('Enter')
  // Al acertar, la palabra que sonaba aparece escrita (y la partida sigue sola enseguida).
  await expect(page.getByRole('heading', { level: 1, name: word?.en })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Meta de hoy' })).toHaveAttribute('aria-valuenow', '1')
})
