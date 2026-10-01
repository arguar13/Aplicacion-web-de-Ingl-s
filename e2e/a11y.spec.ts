import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { answerManyCorrectly, expectAccessible, expectNoHorizontalScroll } from './helpers'

/** Todas las pantallas y paneles, con el título que confirma que ya están pintados. */
const SCREENS: Array<{ path: string; ready: (page: Page) => ReturnType<Page['getByRole']> }> = [
  { path: './', ready: (page) => page.getByRole('heading', { name: 'Tu inglés, hoy.' }) },
  { path: './#/sesion', ready: (page) => page.getByRole('group', { name: 'Respuestas' }) },
  { path: './#/nivel/1', ready: (page) => page.getByRole('group', { name: 'Respuestas' }) },
  { path: './#/repaso', ready: (page) => page.getByRole('heading', { level: 1 }) },
  { path: './#/dificiles', ready: (page) => page.getByRole('heading', { level: 1 }) },
  { path: './#/relampago', ready: (page) => page.getByRole('heading', { level: 1 }) },
  { path: './#/estadisticas', ready: (page) => page.getByRole('heading', { name: 'Tu progreso' }) },
  { path: './#/diccionario', ready: (page) => page.getByRole('searchbox') },
  { path: './#/diccionario?palabra=water', ready: (page) => page.getByRole('dialog') },
  { path: './#/?panel=ajustes', ready: (page) => page.getByRole('dialog', { name: 'Ajustes' }) },
]

for (const theme of ['light', 'dark'] as const) {
  test(`todas las pantallas son accesibles en el tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({ page }) => {
    // Diez pantallas con su análisis de axe: más margen que una prueba normal.
    test.slow()
    await page.addInitScript((value) => {
      localStorage.setItem('tecla:settings:v1', JSON.stringify({ version: 1, theme: value }))
    }, theme)
    // Con algo de progreso, para que las pantallas muestren contenido real y no solo estados vacíos.
    await page.goto('./#/nivel/1')
    await answerManyCorrectly(page, 3)

    await auditScreens(page, theme, SCREENS)
  })
}

/** Recorre las pantallas en orden, sobre la misma página (cada una, un paso del informe). */
async function auditScreens(page: Page, theme: string, screens: typeof SCREENS): Promise<void> {
  const [screen, ...rest] = screens
  if (!screen) return
  await test.step(screen.path, async () => {
    await page.goto(screen.path)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(screen.ready(page).first()).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectAccessible(page)
  })
  return auditScreens(page, theme, rest)
}

test('solo con el teclado: foco visible, Ajustes lo recibe y lo devuelve al cerrarse', async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.hasTouch === true, 'Con teclado físico (escritorio)')
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Tu inglés, hoy.' })).toBeVisible()

  const settings = page.getByRole('button', { name: 'Ajustes' })
  // Tab hasta el botón de Ajustes: se llega con el teclado, y el foco se ve.
  await expect(async () => {
    await page.keyboard.press('Tab')
    await expect(settings).toBeFocused({ timeout: 100 })
  }).toPass({ timeout: 10_000 })
  const outline = await settings.evaluate((element) => getComputedStyle(element).outlineStyle)
  expect(outline).not.toBe('none')

  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Ajustes' })
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(settings).toBeFocused()
})
