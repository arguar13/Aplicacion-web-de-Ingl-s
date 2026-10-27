import type { Page } from '@playwright/test'
import library from '../src/data/texts.json' with { type: 'json' }
import { expect, test } from './fixtures'
import { expectAccessible, expectNoHorizontalScroll } from './helpers'

const family = library.texts.find((text) => text.id === 'a1-my-family')
if (!family) throw new Error('Falta el texto a1-my-family')
const sentences = family.paragraphs.flat()

/**
 * Reconocimiento de voz simulado: «oye» lo que el test deja en `<html data-say>` y termina. Así se
 * prueba la lectura en voz alta de punta a punta sin micrófono.
 */
async function fakeSpeechRecognition(page: Page) {
  await page.addInitScript(() => {
    class FakeRecognition extends EventTarget {
      lang = 'en-US'
      continuous = false
      interimResults = false
      maxAlternatives = 1
      start() {
        setTimeout(() => {
          const result = Object.assign([{ transcript: document.documentElement.dataset.say ?? '' }], { isFinal: true })
          this.dispatchEvent(Object.assign(new Event('result'), { results: [result] }))
          setTimeout(() => this.dispatchEvent(new Event('end')), 30)
        }, 30)
      }
      stop() {}
      abort() {}
    }
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      Object.defineProperty(window, name, { value: FakeRecognition, configurable: true })
    }
  })
}

/** Lo que «dirá» el usuario la próxima vez que toque el micrófono. */
const say = (page: Page, text: string) =>
  page.evaluate((spoken) => {
    document.documentElement.dataset.say = spoken
  }, text)

/** Lee en voz alta las frases desde `index`, una tras otra (la segunda, mal la primera vez). */
async function readFrom(page: Page, index: number): Promise<void> {
  const sentence = sentences[index]
  if (!sentence) return
  if (index === 1) {
    // Una frase mal leída: se puede repetir y la mejor lectura es la que cuenta.
    await say(page, 'hello')
    await page.getByRole('button', { name: 'Leer la frase en voz alta' }).click()
    await expect(page.getByText(/Se entendió el \d+ %/)).toBeVisible()
    await say(page, sentence.en)
    await page.getByRole('button', { name: 'Repetir' }).click()
  } else {
    await say(page, sentence.en)
    await page.getByRole('button', { name: 'Leer la frase en voz alta' }).click()
  }
  await expect(page.getByText(/¡Muy bien! 100 %/)).toBeVisible()
  const last = index === sentences.length - 1
  await page.getByRole('button', { name: last ? 'Ver mi resultado' : 'Siguiente frase' }).click()
  return readFrom(page, index + 1)
}

test('«Practica por tu cuenta» abre las dos bibliotecas de textos', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Entrena el oído/ }).click()
  await expect(page).toHaveURL(/#\/escuchar$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Entrena el oído' })).toBeVisible()
  await expect(page.getByText(/Recomendado para ti · A1/)).toBeVisible()
  await expect(page.getByRole('button', { name: /My Family/ }).first()).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  // El filtro por nivel deja solo ese nivel.
  await page.getByRole('group', { name: 'Nivel' }).getByRole('button', { name: 'C2' }).click()
  await expect(page.getByRole('heading', { name: /C2/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /A1/ })).toHaveCount(0)

  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Lee en voz alta' }).click()
  await expect(page).toHaveURL(/#\/leer-en-voz-alta$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Lee en voz alta' })).toBeVisible()
})

test('escuchar un texto: primero sin leer; el texto y la traducción, a un toque', async ({ page }) => {
  await page.goto(`./#/escuchar/${family.id}`)
  await expect(page.getByRole('heading', { level: 1, name: family.title })).toBeVisible()
  const first = sentences[0]
  await expect(page.getByText(first.en)).toHaveCount(0)
  await expect(page.getByText(first.es)).toHaveCount(0)
  await expectAccessible(page)

  await page.getByRole('button', { name: 'Texto', exact: true }).click()
  await expect(page.getByText(first.en)).toBeVisible()
  await page.getByRole('button', { name: 'Traducción' }).click()
  await expect(page.getByText(first.es)).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  // Con el teclado: T oculta la traducción y → pasa a la frase siguiente.
  await page.keyboard.press('t')
  await expect(page.getByText(first.es)).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText(`2 / ${sentences.length}`)).toBeVisible()
})

test('leer un texto en voz alta marca cada frase y da la nota de pronunciación', async ({ page }) => {
  test.slow()
  await fakeSpeechRecognition(page)
  await page.goto(`./#/leer-en-voz-alta/${family.id}`)
  await expect(page.getByText(`Frase 1 de ${sentences.length}`)).toBeVisible()
  await expectAccessible(page)

  await readFrom(page, 0)

  await expect(page.getByText('Tu pronunciación')).toBeVisible()
  await expect(page.getByText('100 %', { exact: true })).toBeVisible()
  await expect(page.getByText(/texto superado/)).toBeVisible()
  await expectAccessible(page)

  // Queda anotado en la biblioteca y en el inicio.
  await page.goto('./#/leer-en-voz-alta')
  await expect(page.getByRole('button', { name: /My Family/ }).last()).toContainText('Voz 100 %')
  await page.goto('./')
  await expect(page.getByRole('button', { name: /Lee en voz alta/ })).toContainText('1 de 36 textos superados')
})

test('sin reconocimiento de voz, leer en voz alta ofrece escuchar el texto', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'SpeechRecognition')
    Reflect.deleteProperty(window, 'webkitSpeechRecognition')
  })
  await page.goto(`./#/leer-en-voz-alta/${family.id}`)
  await expect(page.getByText('Este navegador no puede escuchar tu voz')).toBeVisible()
  await page.getByRole('button', { name: 'Escuchar el texto' }).click()
  await expect(page).toHaveURL(new RegExp(`#/escuchar/${family.id}$`))
})
