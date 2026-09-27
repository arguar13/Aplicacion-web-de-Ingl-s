/**
 * Genera las imágenes de presentación de Tecla:
 *   public/og.png                    Imagen para compartir el enlace (1200×630).
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
const [serif, serifItalic, inter] = await Promise.all([
  fontUrl('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2'),
  fontUrl('@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'),
  fontUrl('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
])

/** Imagen para compartir: el mismo lenguaje visual que la app (papel cálido, índigo, serif). */
const ogHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face { font-family: Serif; src: url(${serif}) format('woff2'); }
@font-face { font-family: Serif; font-style: italic; src: url(${serifItalic}) format('woff2'); }
@font-face { font-family: Inter; font-weight: 100 900; src: url(${inter}) format('woff2'); }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; font-family: Inter; color: #1c1a17;
  background: radial-gradient(900px 520px at 78% -10%, #e6e3fa, transparent 70%), #f4f1ea;
  display: grid; grid-template-columns: 1fr 470px; align-items: center; gap: 56px; padding: 0 84px; }
.brand { display: flex; align-items: center; gap: 16px; font-size: 26px; font-weight: 600; letter-spacing: -0.01em; }
.logo { width: 60px; height: 60px; transform: rotate(-6deg); }
h1 { font-family: Serif; font-weight: 400; font-size: 96px; line-height: 1; letter-spacing: -0.02em; margin-top: 44px; }
h1 em { color: #4338ca; }
p { margin-top: 26px; font-size: 27px; line-height: 1.4; color: #5b564d; max-width: 520px; text-wrap: pretty; }
.card { background: #fffdf8; border: 1px solid #e4dfd3; border-radius: 36px; padding: 40px 36px 36px;
  box-shadow: 0 30px 60px -30px rgba(40, 32, 90, .35); }
.eyebrow { text-align: center; font-size: 13px; letter-spacing: .2em; text-transform: uppercase; color: #6a645a; }
.word { text-align: center; font-family: Serif; font-size: 84px; line-height: 1; margin: 18px 0 34px; }
.keys { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.key { display: flex; align-items: center; gap: 12px; border: 1px solid #e4dfd3; border-radius: 18px; padding: 16px;
  font-size: 22px; font-weight: 500; background: #fffdf8; box-shadow: 0 3px 0 0 #e4dfd3; }
.key b { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: #f4f1ea;
  font-size: 15px; font-weight: 600; color: #6a645a; }
.key.ok { border-color: #1f7a4d; background: #e3f3ea; box-shadow: 0 3px 0 0 #1f7a4d; color: #145c39; }
.key.ok b { background: #1f7a4d; color: #fff; }
</style></head><body>
<div>
  <div class="brand"><svg class="logo" viewBox="0 0 64 64"><rect x="4" y="8" width="56" height="52" rx="14" fill="#2f2a8f"/><rect x="4" y="4" width="56" height="50" rx="14" fill="#4338ca"/><text x="32" y="41" font-family="Serif" font-size="30" font-style="italic" fill="#fff" text-anchor="middle">Aa</text></svg>Tecla</div>
  <h1>Inglés, <em>tecla</em><br>a tecla</h1>
  <p>Las 3978 palabras más usadas, con repaso espaciado. Pocos minutos al día.</p>
</div>
<div class="card">
  <div class="eyebrow">¿Qué significa?</div>
  <div class="word" lang="en">water</div>
  <div class="keys">
    <div class="key"><b>1</b>fuego</div><div class="key ok"><b>2</b>agua</div>
    <div class="key"><b>3</b>tierra</div><div class="key"><b>4</b>aire</div>
  </div>
</div>
</body></html>`

const browser = await chromium.launch()

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await og.setContent(ogHtml)
await og.evaluate(() => document.fonts.ready)
await og.screenshot({ path: out('og.png') })
await og.close()

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
