import { getSettings, subscribeSettings } from './settings'

/** Color de la barra del navegador en móvil para cada tema (igual que --bg en index.css). */
const THEME_COLOR = { light: '#f4f1ea', dark: '#0f1013' } as const

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

function apply() {
  const preference = getSettings().theme
  const theme = preference === 'system' ? (systemDark() ? 'dark' : 'light') : preference
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

/** Mantiene el tema de la página sincronizado con los ajustes y con el sistema operativo. */
export function initTheme() {
  apply()
  subscribeSettings(apply)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
}
