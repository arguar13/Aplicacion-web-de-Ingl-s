import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import words from '../src/data/words.json' with { type: 'json' }
import { expectAccessible, optionKey } from './helpers'

const byEn = new Map(words.map((w) => [w.en, w]))

/** Acierta `count` palabras seguidas, dejando pasar el destello de cada acierto. */
async function answerBlitz(page: Page, count: number): Promise<void> {
  if (count <= 0) return
  const word = byEn.get(((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim())
  await optionKey(page, word?.es ?? '')
    .first()
    .click()
  await page.clock.runFor(400)
  return answerBlitz(page, count - 1)
}

async function seedSeen(page: Page, count: number, best = 0) {
  await page.goto('./')
  await page.evaluate(
    ({ ids, best: record }) => {
      const now = Date.now()
      const cards: Record<string, unknown> = {}
      for (const id of ids) {
        cards[`en-es:${id}`] = {
          due: now + 86_400_000,
          stability: 3,
          difficulty: 5,
          phase: 'review',
          step: 0,
          reps: 2,
          lapses: 0,
          last: now,
        }
      }
      localStorage.setItem(
        'tecla:progress:v1',
        JSON.stringify({ version: 2, cards, days: [], history: {}, bestStreak: 0, blitzBest: record }),
      )
    },
    { ids: words.slice(0, count).map((w) => w.id), best },
  )
  await page.reload()
}

test('relámpago: 60 segundos, cuenta aciertos y guarda el récord sin tocar el repaso', async ({ page }) => {
  await page.clock.install()
  await seedSeen(page, 20, 0)
  const before = await page.evaluate(() => localStorage.getItem('tecla:progress:v1'))
  await page.getByRole('button', { name: /Relámpago/ }).click()
  await expect(page).toHaveURL(/#\/relampago$/)
  await page.getByRole('button', { name: /Empezar/ }).click()

  await answerBlitz(page, 3)
  // Saltar el tiempo (sin ejecutar cada fotograma intermedio): la cuenta atrás mide con
  // performance.now(), así que en el siguiente fotograma ve el tiempo agotado.
  await page.clock.fastForward(61_000)
  await page.clock.runFor(100)

  await expect(page.getByText('¡Tiempo!')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('3')
  await expect(page.getByText('¡Nuevo récord!')).toBeVisible()
  await expectAccessible(page)

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tecla:progress:v1') ?? '{}'))
  expect(saved.blitzBest).toBe(3)
  // Las tarjetas no cambian: es un juego, no un repaso.
  expect(saved.cards).toEqual(JSON.parse(before ?? '{}').cards)
})

test('con pocas palabras vistas, invita a practicar primero', async ({ page }) => {
  await seedSeen(page, 5)
  await page.goto('./#/relampago')
  await expect(page.getByRole('heading', { name: 'Aún no hay suficientes palabras' })).toBeVisible()
})
