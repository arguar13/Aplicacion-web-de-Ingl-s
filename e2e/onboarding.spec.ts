import type { Page } from '@playwright/test'
import words from '../src/data/words.json' with { type: 'json' }
import { expect, test } from './fixtures'
import { expectAccessible, expectNoHorizontalScroll, optionKey } from './helpers'

test.use({ onboarded: false })

const byEn = new Map(words.map((w) => [w.en, w]))
const rank = new Map(words.map((w, i) => [w.en, i]))

/** Responde la prueba: acierta las palabras de los niveles hasta `upTo` y "no la sé" en el resto. */
async function takeTest(page: Page, upTo: number): Promise<void> {
  const heading = page.getByRole('heading', { level: 1 })
  const text = ((await heading.textContent()) ?? '').trim()
  const word = byEn.get(text)
  if (!word) return
  const level = Math.floor((rank.get(text) ?? 0) / 500) + 1
  if (level <= upTo) await optionKey(page, word.es).first().click()
  else await page.getByRole('button', { name: /No la sé/ }).click()
  await expect(heading).not.toHaveText(text)
  return takeTest(page, upTo)
}

test('primer uso: meta diaria y prueba de nivel que recomienda por dónde empezar', async ({ page }) => {
  // Recorre la prueba de nivel entera (una docena de respuestas y un análisis de axe): más margen.
  test.slow()
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /Inglés, tecla a tecla/ })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Empezar' }).click()

  await page.getByText('En serio').click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: /Hacer la prueba de nivel/ }).click()

  await takeTest(page, 2)
  await expect(page.getByRole('heading', { name: /Nivel 3 · Cotidiano/ })).toBeVisible()
  // Un nivel se supera con 2 aciertos: la tercera palabra ya no se pregunta.
  await expect(page.getByText(/Acertaste 4 palabras/)).toBeVisible()
  await page.getByRole('button', { name: /Empezar desde el nivel 3/ }).click()
  // La sesión inteligente arranca en el nivel recomendado.
  await expect(page).toHaveURL(/#\/sesion$/)

  const saved = await page.evaluate(() => ({
    settings: JSON.parse(localStorage.getItem('tecla:settings:v1') ?? '{}'),
    progress: JSON.parse(localStorage.getItem('tecla:progress:v1') ?? '{}'),
  }))
  expect(saved.settings.dailyGoal).toBe(40)
  expect(saved.settings.startLevel).toBe(3)
  expect(Object.keys(saved.progress.cards)).toHaveLength(4)

  // Terminada, no vuelve a aparecer.
  await page.goto('./')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Escucha, piensa, pulsa.' })).toBeVisible()
})

test('primer uso: se puede saltar', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Saltar' }).click()
  await expect(page.getByRole('heading', { name: 'Escucha, piensa, pulsa.' })).toBeVisible()
})
