import { readFile } from 'node:fs/promises'
import words from '../src/data/words.json' with { type: 'json' }
import { expect, test } from './fixtures'
import { expectAccessible, expectNoHorizontalScroll } from './helpers'

declare global {
  interface Window {
    /** Lo último que "dijo" la síntesis de voz simulada. */
    spokenText?: string
  }
}

/** Así lo escribe la app (sin separador de miles en español hasta 9999). */
const TOTAL = `${words.length} palabras`

test('el diccionario busca en los dos idiomas y abre la ficha de cada palabra', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Diccionario' }).click()
  await expect(page).toHaveURL(/#\/diccionario$/)
  await expect(page.getByText(TOTAL, { exact: true })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  await page.getByLabel('Buscar en inglés o en español').fill('ÁRBOL')
  const list = page.getByRole('list', { name: 'Palabras' })
  await expect(list.getByRole('button').first()).toContainText('tree')

  await list.getByRole('button').first().click()
  await expect(page).toHaveURL(/\?palabra=tree$/)
  const sheet = page.getByRole('dialog', { name: 'tree' })
  await expect(sheet.getByText('árbol', { exact: true })).toBeVisible()
  await expect(sheet.locator('blockquote mark')).toHaveText(/tree/i)
  await expectAccessible(page)

  // Favorita y "ya la sé", con deshacer.
  await sheet.getByRole('button', { name: 'Marcar favorita' }).click()
  await expect(sheet.getByRole('button', { name: 'Favorita' })).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByRole('button', { name: 'Ya la sé' }).click()
  await expect(sheet.getByText(/Dominada · repaso en 30 días/)).toBeVisible()
  await sheet.getByRole('button', { name: /Deshacer/ }).click()
  await expect(sheet.getByRole('definition').first()).toHaveText('Nueva')

  // El botón atrás cierra la ficha y deja el diccionario como estaba.
  await page.goBack()
  await expect(sheet).toBeHidden()
  await expect(page.getByLabel('Buscar en inglés o en español')).toHaveValue('ÁRBOL')

  await page.getByText('Favoritas', { exact: true }).click()
  await expect(list.getByRole('button')).toHaveCount(1)
})

test('la lista de todas las palabras solo pinta lo visible', async ({ page }) => {
  await page.goto('./#/diccionario')
  const rows = page.getByRole('list', { name: 'Palabras' }).getByRole('listitem')
  expect(await rows.count()).toBeLessThan(60)
  // scrollTo y no la rueda del ratón: WebKit móvil no la simula.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(rows.first()).not.toContainText(/^.*\bthe\b/)
  expect(await rows.count()).toBeLessThan(60)
})

test('la lista filtrada se exporta como CSV con cabecera, detalles y estado', async ({ page }) => {
  await page.goto('./#/diccionario')
  await page.getByLabel('Buscar en inglés o en español').fill('water')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^tecla-vocabulario-\d{4}-\d{2}-\d{2}\.csv$/)
  const file = await download.path()
  const text = await readFile(file, 'utf8')
  const lines = text.replace('\uFEFF', '').trimEnd().split('\r\n')
  expect(lines[0]).toBe('ingles,espanol,categoria,ipa,ejemplo,ejemplo_es,estado,favorita')
  expect(lines[1]).toMatch(/^water,agua,sustantivo,\/.+\/,.+water.+,.+,nueva,$/)
})

test('la frase de ejemplo se puede oír con la voz del navegador cuando hay una voz en inglés', async ({ page }) => {
  // Síntesis de voz simulada con una voz en inglés: lo dicho queda en window.spokenText.
  await page.addInitScript(() => {
    const voices = [{ name: 'Samantha', lang: 'en-US', default: true, localService: true, voiceURI: 'Samantha' }]
    const synthesis = Object.assign(new EventTarget(), {
      getVoices: () => voices,
      speak: (utterance: { text: string }) => {
        Object.assign(window, { spokenText: utterance.text })
      },
      cancel: () => undefined,
    })
    Object.defineProperty(window, 'speechSynthesis', { value: synthesis })
    // La clase real rechaza una voz que no sea suya: la simulación trae la suya, que guarda el texto.
    class FakeUtterance {
      voice: unknown = null
      lang = ''
      rate = 1
      constructor(public text: string) {}
    }
    Object.assign(window, { SpeechSynthesisUtterance: FakeUtterance })
  })
  await page.goto('./#/diccionario?palabra=water')
  const sheet = page.getByRole('dialog', { name: 'water' })
  const example = (await sheet.locator('blockquote').textContent())?.trim() ?? ''
  await sheet.getByRole('button', { name: 'Escuchar la frase' }).click()
  await expect.poll(() => page.evaluate(() => window.spokenText)).toBe(example)
})
