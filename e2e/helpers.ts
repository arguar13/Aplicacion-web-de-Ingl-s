import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'
import words from '../src/data/words.json' with { type: 'json' }

const byEnglish = new Map(words.map((word) => [word.en, word]))

/** Palabra que se está preguntando ahora (modo inglés → español). */
export async function currentWord(page: Page) {
  const prompt = page.getByRole('heading', { level: 1 })
  await expect(prompt).toBeVisible()
  const text = (await prompt.textContent())?.trim() ?? ''
  const word = byEnglish.get(text)
  if (!word) throw new Error(`La palabra "${text}" no está en el vocabulario`)
  return word
}

/** Tecla de respuesta con la traducción indicada. */
export const optionKey = (page: Page, label: string) =>
  page
    .getByRole('group', { name: 'Respuestas' })
    .getByRole('button')
    .filter({ has: page.getByText(label, { exact: true }) })

/** Responde bien la palabra actual y espera a que aparezca la siguiente. */
export async function answerCorrectly(page: Page) {
  const word = await currentWord(page)
  await optionKey(page, word.es).first().click()
  await expect(page.getByText(/¡Correcto!|Eso es\./)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(word.en, { timeout: 3000 })
  return word
}

/** La página no se desplaza en horizontal: nada se sale del ancho de la pantalla. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

/** Sin problemas de accesibilidad graves (WCAG 2.2 AA) en lo que se ve. */
export async function expectAccessible(page: Page) {
  // Se mide la interfaz ya asentada: durante las animaciones de entrada el texto está semitransparente.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)).toEqual([])
}

/** Progreso guardado en el dispositivo. */
export const storedProgress = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('tecla:progress:v1') ?? 'null') as unknown)

/** Texto literal dentro de una expresión regular ("(de ir)" no es un grupo). */
export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
