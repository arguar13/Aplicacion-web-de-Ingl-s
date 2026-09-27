/**
 * Presupuesto de tamaño del build (gzip). Falla si la carga inicial o una pantalla diferida crece
 * más de lo acordado: así un aumento se decide, no se cuela.
 *
 *   npm run build && npm run budget
 */
import { readdir, readFile } from 'node:fs/promises'
import { EOL } from 'node:os'
import { gzipSync } from 'node:zlib'

const KB = 1024
const BUDGET = {
  /** JS que el inicio necesita antes de pintarse (entrada + modulepreload). */
  initialJs: 165 * KB,
  initialCss: 14 * KB,
  /** Cada pantalla que se carga al abrirla. */
  lazyChunk: 30 * KB,
}
/** Datos que se cargan aparte, en segundo plano: no son pantallas ni frenan el arranque. */
const DATA_CHUNKS = [/^details-/, /^_virtual_audio-versions-/]

const dist = new URL('../dist/', import.meta.url)
const html = await readFile(new URL('index.html', dist), 'utf8')
const refs = (pattern) => [...html.matchAll(pattern)].map((match) => match[1].replace(/^\.\//, ''))
const initialJs = [
  ...refs(/<script type="module"[^>]*src="([^"]+)"/g),
  ...refs(/<link rel="modulepreload"[^>]*href="([^"]+)"/g),
]
const initialCss = refs(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)

const gzipped = async (path) => gzipSync(await readFile(new URL(path, dist))).length
const sum = async (paths) => (await Promise.all(paths.map(gzipped))).reduce((a, b) => a + b, 0)
const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`

const checks = [
  { name: 'JS inicial', size: await sum(initialJs), budget: BUDGET.initialJs },
  { name: 'CSS inicial', size: await sum(initialCss), budget: BUDGET.initialCss },
]
const assets = await readdir(new URL('assets/', dist))
const lazy = assets.filter(
  (file) =>
    file.endsWith('.js') && !initialJs.includes(`assets/${file}`) && !DATA_CHUNKS.some((pattern) => pattern.test(file)),
)
const lazySizes = await Promise.all(lazy.map((file) => gzipped(`assets/${file}`)))
lazy.forEach((file, i) => checks.push({ name: `diferido ${file}`, size: lazySizes[i], budget: BUDGET.lazyChunk }))

const over = checks.filter((check) => check.size > check.budget)
for (const check of checks) {
  const mark = check.size > check.budget ? '✗' : '✓'
  process.stdout.write(`${mark} ${check.name}: ${kb(check.size)} de ${kb(check.budget)}${EOL}`)
}
if (over.length > 0) {
  process.stderr.write(`${EOL}Fuera de presupuesto: ${over.map((check) => check.name).join(', ')}${EOL}`)
  process.exitCode = 1
}
