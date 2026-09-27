import { expect, type Page, test } from '@playwright/test'
import words from '../src/data/words.json' with { type: 'json' }
import { currentWord, expectAccessible, expectNoHorizontalScroll } from './helpers'

/** Progreso con 3 palabras por repasar hoy (una de ellas difícil) y otra para dentro de 3 días. */
async function seed(page: Page) {
  await page.goto('./')
  await page.evaluate(
    (ids) => {
      const now = Date.now()
      const day = 86_400_000
      const card = (due: number, lapses: number) => ({
        due,
        stability: 3,
        difficulty: 5,
        phase: 'review',
        step: 0,
        reps: 4,
        lapses,
        last: due - 3 * day,
      })
      const cards = {
        [`en-es:${ids[0]}`]: card(now - day, 3),
        [`en-es:${ids[1]}`]: card(now - 3_600_000, 0),
        [`en-es:${ids[2]}`]: card(now - 60_000, 0),
        [`en-es:${ids[3]}`]: card(now + 3 * day, 0),
      }
      localStorage.setItem(
        'tecla:progress:v1',
        JSON.stringify({ version: 2, cards, days: [], history: {}, bestStreak: 0 }),
      )
    },
    words.slice(700, 704).map((w) => w.id),
  )
  await page.reload()
}

test('el repaso del día reúne lo que toca hoy de todos los niveles', async ({ page }) => {
  await seed(page)
  const card = page.getByRole('button', { name: /Repaso del día/ })
  await expect(card).toContainText('3 palabras te esperan hoy')
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  await card.click()
  await expect(page).toHaveURL(/#\/repaso$/)
  await expect(page).toHaveTitle('Repaso del día — Tecla')
  const word = await currentWord(page)
  expect(words.slice(700, 703).map((w) => w.en)).toContain(word.en)
  await expect(page.getByRole('group', { name: 'Respuestas' }).getByRole('button')).toHaveCount(4)
})

test('"Mis difíciles" junta las palabras que más se olvidan', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: /Mis difíciles/ }).click()
  await expect(page).toHaveURL(/#\/dificiles$/)
  expect((await currentWord(page)).en).toBe(words[700].en)
})

test('sin nada que repasar, el mazo muestra "Todo al día" y las difíciles están desactivadas', async ({ page }) => {
  await page.goto('./#/repaso')
  await expect(page.getByRole('heading', { name: 'Todo al día' })).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Volver a los niveles' }).click()
  await expect(page).toHaveURL(/#\/$/)
})
