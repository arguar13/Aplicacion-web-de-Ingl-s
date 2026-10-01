// Avisa a los buscadores que usan IndexNow (Bing, que también alimenta a Yahoo y DuckDuckGo; Yandex,
// Seznam, Naver) de que el sitio cambió, para que lo rastreen pronto. La clave es pública: el archivo
// public/<clave>.txt, publicado en la raíz del sitio, demuestra que el sitio es nuestro. Google no usa
// IndexNow (para Google está Search Console). Lo llama scripts/deploy.sh después de subir; un fallo
// aquí no tumba el despliegue.
import { readdirSync } from 'node:fs'
import { EOL } from 'node:os'

const log = (line) => process.stdout.write(`${line}${EOL}`)

const site = process.env.SITE_URL
if (!site) {
  log('IndexNow: sin SITE_URL, no se avisa a los buscadores.')
  process.exit(0)
}

const keyFile = readdirSync('public').find((file) => /^[0-9a-f]{32}\.txt$/.test(file))
if (!keyFile) {
  log('IndexNow: falta la clave en public/<clave>.txt.')
  process.exit(1)
}
const key = keyFile.slice(0, -'.txt'.length)
const root = new URL(site)

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: root.host,
    key,
    keyLocation: new URL(keyFile, root).href,
    urlList: [root.href],
  }),
})
// 200: recibido. 202: recibido, la clave se valida después. Otro: la clave o la URL no son válidas.
const accepted = response.status === 200 || response.status === 202
log(`IndexNow: ${accepted ? 'buscadores avisados' : 'aviso rechazado'} (HTTP ${response.status}).`)
process.exit(accepted ? 0 : 1)
