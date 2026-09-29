/**
 * Genera las imágenes de presentación de Tecla:
 *   public/og.png                    Imagen para compartir el enlace (1200×630).
 *   public/icons/*.png               Íconos de la PWA, desde el mismo SVG que public/favicon.svg.
 *   public/screenshots/*.png         Capturas del manifiesto (instalación enriquecida).
 *
 * Las capturas son de la app real: requiere el build servido en local.
 *   npm run build && npx vite preview --port 4173 --strictPort
 *   npm run capture
 */
import { mkdir, readFile } from 'node:fs/promises'
import { EOL } from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const APP = process.env.CAPTURE_URL ?? 'http://127.0.0.1:4173/'
const root = new URL('../', import.meta.url)
const out = (path) => fileURLToPath(new URL(`public/${path}`, root))

const words = JSON.parse(await readFile(new URL('src/data/words.json', root), 'utf8'))
const byEnglish = new Map(words.map((word) => [word.en, word]))

const fontUrl = async (path) =>
  `data:font/woff2;base64,${(await readFile(new URL(`node_modules/${path}`, root))).toString('base64')}`
const [geist, inter] = await Promise.all([
  fontUrl('@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'),
  fontUrl('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
])

/** Logo (igual que public/favicon.svg): una "T" con un punto sobre el degradado de marca. */
const logo = (id, { bleed = false, glyphScale = 1 } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#7c3aed"/>
  </linearGradient></defs>
  ${bleed ? `<rect width="64" height="64" fill="url(#${id})"/>` : `<rect x="2" y="2" width="60" height="60" rx="18" fill="url(#${id})"/>`}
  <g transform="translate(32 32) scale(${glyphScale}) translate(-32 -32)">
    <rect x="17" y="17" width="30" height="8" rx="4" fill="#fff"/>
    <rect x="28" y="17" width="8" height="30" rx="4" fill="#fff"/>
    <circle cx="45" cy="43" r="4" fill="#fff" opacity=".75"/>
  </g>
</svg>`

/** Imagen para compartir: el mismo lenguaje visual que la app (neutros fríos, aurora, Geist). */
const ogHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face { font-family: Geist; font-weight: 100 900; src: url(${geist}) format('woff2'); }
@font-face { font-family: Inter; font-weight: 100 900; src: url(${inter}) format('woff2'); }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; font-family: Inter; color: #0c0c14;
  background: radial-gradient(760px 480px at 8% -8%, rgb(99 102 241 / .18), transparent 62%),
    radial-gradient(760px 480px at 96% 0%, rgb(168 85 247 / .16), transparent 60%), #f6f6f9;
  display: grid; grid-template-columns: 1fr 470px; align-items: center; gap: 56px; padding: 0 84px; }
.brand { display: flex; align-items: center; gap: 14px; font-family: Geist; font-size: 28px; font-weight: 600; letter-spacing: -0.03em; }
.logo { width: 52px; height: 52px; }
h1 { font-family: Geist; font-weight: 650; font-size: 92px; line-height: .98; letter-spacing: -0.045em; margin-top: 40px; }
h1 span { background: linear-gradient(135deg, #4f46e5, #7c3aed); -webkit-background-clip: text; background-clip: text; color: transparent; }
p { margin-top: 26px; font-size: 26px; line-height: 1.4; color: #5d6070; max-width: 520px; text-wrap: pretty; }
.card { background: #fff; border: 1px solid #e6e6ee; border-radius: 32px; padding: 38px 34px 34px;
  box-shadow: 0 1px 2px rgb(15 15 35 / .04), 0 40px 80px -30px rgb(79 70 229 / .35); }
.eyebrow { text-align: center; font-size: 13px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #5d6070; }
.word { text-align: center; font-family: Geist; font-weight: 650; letter-spacing: -0.04em; font-size: 88px; line-height: 1; margin: 18px 0 32px; }
.keys { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.key { display: flex; align-items: center; justify-content: center; border: 1px solid #e6e6ee; border-radius: 20px; padding: 22px 16px;
  font-size: 22px; font-weight: 550; background: #fff; box-shadow: 0 1px 2px rgb(15 15 35 / .06), 0 4px 12px -6px rgb(15 15 35 / .08); }
.key.ok { border-color: #047857; background: #047857; color: #fff; box-shadow: 0 16px 36px -16px #047857; }
</style></head><body>
<div>
  <div class="brand"><span class="logo">${logo('og')}</span>Tecla</div>
  <h1>Inglés, <span>tecla</span><br>a tecla</h1>
  <p>Las palabras más usadas del inglés, con repaso espaciado inteligente. Gratis.</p>
</div>
<div class="card">
  <div class="eyebrow">¿Qué significa?</div>
  <div class="word" lang="en">water</div>
  <div class="keys">
    <div class="key">fuego</div><div class="key ok">agua</div>
    <div class="key">tierra</div><div class="key">aire</div>
  </div>
</div>
</body></html>`

const browser = await chromium.launch()

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await og.setContent(ogHtml)
await og.evaluate(() => document.fonts.ready)
await og.screenshot({ path: out('og.png') })
await og.close()

/**
 * Íconos de la PWA desde el mismo SVG: normales (con esquinas redondeadas y fondo transparente),
 * "maskable" para Android (a sangre, con la letra dentro de la zona segura del 80 %) y el de iOS
 * (a sangre: iOS redondea las esquinas por su cuenta).
 */
const ICONS = [
  { file: 'icons/icon-192.png', size: 192, svg: logo('i192') },
  { file: 'icons/icon-512.png', size: 512, svg: logo('i512') },
  { file: 'icons/maskable-512.png', size: 512, svg: logo('m512', { bleed: true, glyphScale: 0.8 }) },
  { file: 'icons/apple-touch-icon.png', size: 180, svg: logo('a180', { bleed: true, glyphScale: 0.9 }) },
]
async function renderIcon({ file, size, svg }) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<body style="margin:0">${svg}</body>`)
  await page.screenshot({ path: out(file), omitBackground: true })
  await page.close()
}
await Promise.all(ICONS.map(renderIcon))

/** Responde bien la palabra en pantalla y, en cadena, las `remaining` siguientes. */
async function practice(page, remaining) {
  if (remaining <= 0) return
  const text = (await page.getByRole('heading', { level: 1 }).textContent()).trim()
  await page
    .getByRole('group', { name: 'Respuestas' })
    .getByRole('button')
    .filter({ has: page.getByText(byEnglish.get(text).es, { exact: true }) })
    .first()
    .click()
  await page.waitForFunction((previous) => document.querySelector('h1')?.textContent?.trim() !== previous, text)
  await practice(page, remaining - 1)
}

const shots = [
  { name: 'inicio-movil', viewport: { width: 412, height: 915 }, scale: 2, touch: true, route: '#/' },
  { name: 'partida-movil', viewport: { width: 412, height: 915 }, scale: 2, touch: true, route: '#/nivel/1' },
  { name: 'inicio-escritorio', viewport: { width: 1280, height: 800 }, scale: 1, touch: false, route: '#/' },
]

/** Cada captura en su propio navegador limpio, con unas cuantas palabras ya practicadas. */
async function capture(shot) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: shot.scale,
    // Como un teléfono de verdad: sin estados hover ni atajos de teclado.
    isMobile: shot.touch,
    hasTouch: shot.touch,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  })
  await context.addInitScript(() => {
    localStorage.setItem('tecla:onboarding', JSON.stringify({ version: 1, done: true }))
    localStorage.setItem('tecla:settings:v1', JSON.stringify({ version: 1, autoplay: false, sounds: false }))
  })
  const page = await context.newPage()
  await page.goto(`${APP}#/nivel/1`)
  await practice(page, 14)
  await page.goto(`${APP}${shot.route}`)
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out(`screenshots/${shot.name}.png`) })
  await context.close()
}

await mkdir(out('screenshots'), { recursive: true })
await Promise.all(shots.map(capture))
await browser.close()
process.stdout.write(`Listo: public/og.png y public/screenshots/${EOL}`)
