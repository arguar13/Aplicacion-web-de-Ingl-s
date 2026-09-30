import { readFileSync, writeFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WelcomeShell } from './Welcome'

const INDEX = new URL('../../index.html', import.meta.url)

describe('bienvenida pintada desde el HTML', () => {
  // Tras cambiar la bienvenida: WRITE_WELCOME=1 npx vitest run src/components/Welcome.test.tsx
  it.runIf(process.env.WRITE_WELCOME === '1')('regenera la copia de index.html', () => {
    const html = readFileSync(INDEX, 'utf8')
    const markup = renderToStaticMarkup(<WelcomeShell />)
    writeFileSync(INDEX, html.replace(/(<template id="bienvenida">)[\s\S]*?(<\/template>)/, `$1${markup}$2`))
    expect(readFileSync(INDEX, 'utf8')).toContain(markup)
  })

  it('la copia de index.html es idéntica a la de la app (si no, regenerarla: ver arriba)', () => {
    const html = readFileSync(INDEX, 'utf8')
    const template = /<template id="bienvenida">([\s\S]*?)<\/template>/.exec(html)?.[1]
    expect(template).toBe(renderToStaticMarkup(<WelcomeShell />))
  })

  it('sus botones se anuncian como inactivos hasta que llega la app', () => {
    const markup = renderToStaticMarkup(<WelcomeShell />)
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(3)
  })
})
