import { test as base } from '@playwright/test'

/**
 * `test` de Playwright con la bienvenida del primer uso ya vista, para que cada prueba empiece en
 * los niveles. Las que prueban la bienvenida usan `test.use({ onboarded: false })`.
 */
export const test = base.extend<{ onboarded: boolean }>({
  onboarded: [true, { option: true }],
  // `provide` entrega la página al test (Playwright lo llama `use`; aquí no es un hook de React).
  page: async ({ page, onboarded }, provide) => {
    if (onboarded) {
      await page.addInitScript(() => {
        if (!localStorage.getItem('tecla:onboarding')) {
          localStorage.setItem('tecla:onboarding', JSON.stringify({ version: 1, done: true }))
        }
      })
    }
    await provide(page)
  },
})

export { expect } from '@playwright/test'
