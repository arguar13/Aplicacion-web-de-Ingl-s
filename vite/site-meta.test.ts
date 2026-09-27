import { describe, expect, it } from 'vitest'
import { parseSiteUrl, robotsTxt, siteTags, sitemapXml } from './site-meta'

const attrsOf = (siteUrl: string | null) => siteTags(siteUrl).map((tag) => tag.attrs)

describe('metadatos del sitio', () => {
  it('normaliza la dirección pública y rechaza lo que no es http(s)', () => {
    expect(parseSiteUrl(undefined)).toBeNull()
    expect(parseSiteUrl('  ')).toBeNull()
    expect(parseSiteUrl('https://tecla.example')).toBe('https://tecla.example/')
    expect(parseSiteUrl('https://ejemplo.com/tecla?x=1#/nivel/2')).toBe('https://ejemplo.com/tecla/')
    expect(() => parseSiteUrl('ftp://ejemplo.com')).toThrow('http(s)')
    expect(() => parseSiteUrl('ejemplo.com')).toThrow(/Invalid URL/)
  })

  it('con dirección: canónica y URLs absolutas', () => {
    const attrs = attrsOf('https://ejemplo.com/tecla/')
    expect(attrs).toContainEqual({ rel: 'canonical', href: 'https://ejemplo.com/tecla/' })
    expect(attrs).toContainEqual({ property: 'og:url', content: 'https://ejemplo.com/tecla/' })
    expect(attrs).toContainEqual({ property: 'og:image', content: 'https://ejemplo.com/tecla/og.png' })
    expect(attrs).toContainEqual({ name: 'twitter:image', content: 'https://ejemplo.com/tecla/og.png' })
  })

  it('sin dirección: ni canónica ni og:url, y la imagen relativa', () => {
    const attrs = attrsOf(null)
    expect(attrs.some((a) => a?.rel === 'canonical' || a?.property === 'og:url')).toBe(false)
    expect(attrs).toContainEqual({ property: 'og:image', content: './og.png' })
  })

  it('robots.txt enlaza el sitemap solo si hay dirección', () => {
    expect(robotsTxt(null)).toBe('User-agent: *\nAllow: /\n')
    expect(robotsTxt('https://ejemplo.com/')).toContain('Sitemap: https://ejemplo.com/sitemap.xml\n')
  })

  it('sitemap.xml con la dirección y la fecha', () => {
    const xml = sitemapXml('https://ejemplo.com/', '2026-09-27')
    expect(xml).toContain('<loc>https://ejemplo.com/</loc><lastmod>2026-09-27</lastmod>')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })
})
