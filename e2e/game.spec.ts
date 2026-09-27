import { expect, test } from './fixtures'
import {
  answerCorrectly,
  currentWord,
  expectAccessible,
  expectNoHorizontalScroll,
  optionKey,
  storedProgress,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('el inicio se ve completo, sin desbordes y accesible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Escucha, piensa, pulsa.' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nivel 1 · Esenciales/ })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)
})

test('elegir un nivel, acertar y fallar', async ({ page }) => {
  await page.getByRole('button', { name: /Empieza aquí/ }).click()
  await expect(page).toHaveURL(/#\/nivel\/1$/)
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  const first = await answerCorrectly(page)
  await expect(page.getByRole('definition').filter({ hasText: /^1$/ }).first()).toBeVisible()

  // Una tecla equivocada se marca y el usuario puede seguir intentando.
  const word = await currentWord(page)
  const wrong = page
    .getByRole('group', { name: 'Respuestas' })
    .getByRole('button')
    .filter({ hasNot: page.locator('span', { hasText: new RegExp(`^${word.es.replace(/[()]/g, '\\$&')}$`) }) })
    .first()
  await wrong.click()
  await expect(page.getByText('No es esa. Prueba otra.')).toBeVisible()
  await expect(wrong).toBeDisabled()
  await optionKey(page, word.es).first().click()
  await expect(page.getByText('Eso es.')).toBeVisible()

  // El progreso queda guardado (FSRS, esquema v2): lo acertado a la primera, más estable que lo fallado.
  const progress = await storedProgress(page)
  expect(progress).toMatchObject({
    version: 2,
    cards: { [`en-es:${first.id}`]: { reps: 1, phase: 'learning' }, [`en-es:${word.id}`]: { reps: 1 } },
  })
  const [clean, failed] = await page.evaluate(
    (keys) => {
      const saved: { cards: Record<string, { stability: number }> } = JSON.parse(
        localStorage.getItem('tecla:progress:v1') ?? '{"cards":{}}',
      )
      return keys.map((key) => saved.cards[key].stability)
    },
    [`en-es:${first.id}`, `en-es:${word.id}`],
  )
  expect(clean).toBeGreaterThan(failed)
})

test('se juega con el teclado', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Atajos de teclado: solo en escritorio')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/nivel\/1$/)
  const word = await currentWord(page)
  const keys = page.getByRole('group', { name: 'Respuestas' }).getByRole('button')
  const labels = await keys.locator('span[lang="es"]').allTextContents()
  await page.keyboard.press(String(labels.indexOf(word.es) + 1))
  await expect(page.getByText('¡Correcto!')).toBeVisible()
  // Con palabras respondidas, Esc muestra antes el resumen; otro Esc sale.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Buen trabajo' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#\/$/)
})
