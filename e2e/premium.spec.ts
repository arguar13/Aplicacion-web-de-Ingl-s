import { expect, test } from './fixtures'
import { answerCorrectly, expectAccessible, expectNoHorizontalScroll } from './helpers'

declare global {
  interface Window {
    /** Lo que "oye" el reconocimiento de voz simulado. */
    spoken?: string
  }
}

test('la palabra del día está en el inicio y abre su ficha', async ({ page }) => {
  await page.goto('./')
  const card = page.getByRole('region', { name: 'Palabra del día' })
  await expect(card).toBeVisible()
  const word = (await card.locator('[lang="en"]').first().textContent())?.trim() ?? ''
  await card.getByRole('button', { name: 'Ver ficha' }).click()
  await expect(page.getByRole('dialog', { name: word })).toBeVisible()
})

test('las colecciones agrupan por tema y se practican con opciones del mismo tema', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Colecciones/ }).click()
  await expect(page).toHaveURL(/#\/colecciones$/)
  await expect(page.getByRole('heading', { name: 'Colecciones' })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectAccessible(page)

  await page.getByRole('button', { name: /Comida y bebida/ }).click()
  await expect(page).toHaveURL(/#\/tema\/comida$/)
  await expect(page.getByText('Comida y bebida')).toBeVisible()
  await answerCorrectly(page)
  await page.getByRole('button', { name: 'Colecciones' }).click()
  await page
    .getByRole('button', { name: /Volver|Terminar|Colecciones/ })
    .first()
    .click()
})

test('pronunciar: el navegador reconoce la palabra dicha', async ({ page }) => {
  // Reconocimiento de voz simulado: al empezar, "oye" window.spoken.
  await page.addInitScript(() => {
    class FakeRecognition extends EventTarget {
      lang = 'en-US'
      maxAlternatives = 1
      interimResults = false
      start() {
        setTimeout(() => {
          const event = Object.assign(new Event('result'), {
            results: [[{ transcript: window.spoken ?? '' }]],
          })
          this.dispatchEvent(event)
          this.dispatchEvent(new Event('end'))
        }, 50)
      }
      abort() {}
    }
    Object.assign(window, { SpeechRecognition: FakeRecognition })
  })
  await page.goto('./#/diccionario?palabra=water')
  const sheet = page.getByRole('dialog', { name: 'water' })
  await expect(sheet.getByText('Pronúnciala')).toBeVisible()

  await page.evaluate(() => (window.spoken = 'the water'))
  await sheet.getByRole('button', { name: 'Decirla' }).click()
  await expect(sheet.getByText('¡Bien dicho!')).toBeVisible()

  await page.evaluate(() => (window.spoken = 'winter'))
  await sheet.getByRole('button', { name: 'Decirla' }).click()
  await expect(sheet.getByText('Oí «winter». Escúchala y prueba otra vez.')).toBeVisible()
  await expectAccessible(page)
})

test('modo concentración: 5 minutos con cuenta atrás y resumen al terminar', async ({ page }) => {
  await page.clock.install()
  await page.goto('./')
  await page.getByRole('button', { name: /Concentración/ }).click()
  await expect(page).toHaveURL(/#\/enfoque$/)
  await expect(page.getByRole('progressbar', { name: 'Tiempo de concentración' })).toHaveAttribute(
    'aria-valuetext',
    /Quedan [45]:\d\d/,
  )
  await answerCorrectly(page)
  // Pasan los 5 minutos: la ronda en curso termina y llega el resumen.
  await page.clock.fastForward('05:01')
  await answerCorrectly(page)
  await expect(page.getByRole('heading', { name: '¡Tiempo cumplido!' })).toBeVisible()
  await expectAccessible(page)
})
