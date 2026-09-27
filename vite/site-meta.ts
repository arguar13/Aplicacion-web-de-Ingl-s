/**
 * Plugin de Vite: lo que necesitan los buscadores y las redes para mostrar Tecla.
 *
 * La dirección pública llega en `SITE_URL` al hacer el build (la pone el despliegue). Con ella se
 * generan la URL canónica, las URLs absolutas de la imagen para compartir y `sitemap.xml`, que
 * por norma tienen que ser absolutas. Sin ella (build local, vista previa) se omiten en lugar de
 * inventar un dominio, y `robots.txt` se genera igual.
 */
import type { HtmlTagDescriptor, Plugin } from 'vite'

/** Imagen para compartir (public/og.png, generada con `npm run og-image`). */
export const OG_IMAGE = { path: 'og.png', width: 1200, height: 630 }
const OG_ALT = 'Tecla: una palabra en inglés sobre un teclado de respuestas en español.'

/** Normaliza la dirección pública: con protocolo http(s) y barra final, o `null` si no hay. */
export function parseSiteUrl(raw: string | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`SITE_URL no es http(s): ${value}`)
  url.hash = ''
  url.search = ''
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url.href
}

const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: 'meta', attrs, injectTo: 'head' })

export function siteTags(siteUrl: string | null): HtmlTagDescriptor[] {
  const image = siteUrl ? new URL(OG_IMAGE.path, siteUrl).href : `./${OG_IMAGE.path}`
  return [
    ...(siteUrl
      ? [
          { tag: 'link', attrs: { rel: 'canonical', href: siteUrl }, injectTo: 'head' } satisfies HtmlTagDescriptor,
          meta({ property: 'og:url', content: siteUrl }),
        ]
      : []),
    meta({ property: 'og:image', content: image }),
    meta({ property: 'og:image:width', content: String(OG_IMAGE.width) }),
    meta({ property: 'og:image:height', content: String(OG_IMAGE.height) }),
    meta({ property: 'og:image:alt', content: OG_ALT }),
    meta({ name: 'twitter:image', content: image }),
  ]
}

export function robotsTxt(siteUrl: string | null): string {
  const lines = ['User-agent: *', 'Allow: /']
  if (siteUrl) lines.push('', `Sitemap: ${new URL('sitemap.xml', siteUrl).href}`)
  return `${lines.join('\n')}\n`
}

/** Una sola URL: las pantallas son rutas hash (#/…), que los buscadores no indexan por separado. */
export function sitemapXml(siteUrl: string, lastmod: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${siteUrl}</loc><lastmod>${lastmod}</lastmod></url>`,
    '</urlset>',
    '',
  ].join('\n')
}

export function siteMeta(rawSiteUrl = process.env.SITE_URL): Plugin {
  const siteUrl = parseSiteUrl(rawSiteUrl)
  return {
    name: 'tecla-site-meta',
    transformIndexHtml: () => siteTags(siteUrl),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(siteUrl) })
      if (siteUrl) {
        const lastmod = new Date().toISOString().slice(0, 10)
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(siteUrl, lastmod) })
      }
    },
  }
}
