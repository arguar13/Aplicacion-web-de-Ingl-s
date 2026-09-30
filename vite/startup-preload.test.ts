import { describe, expect, it } from 'vitest'
import { lowerAppPriority, startupTags } from './startup-preload'

const BUNDLE = {
  'assets/index.js': {
    type: 'chunk' as const,
    fileName: 'assets/index.js',
    facadeModuleId: '/p/src/main.tsx',
    imports: ['assets/shared.js'],
  },
  'assets/App.js': {
    type: 'chunk' as const,
    fileName: 'assets/App.js',
    facadeModuleId: String.raw`C:\p\src\App.tsx`,
    imports: ['assets/shared.js', 'assets/decks.js'],
  },
  'assets/decks.js': { type: 'chunk' as const, fileName: 'assets/decks.js', imports: ['assets/shared.js'] },
  'assets/shared.js': { type: 'chunk' as const, fileName: 'assets/shared.js', imports: [] },
  'assets/words-abc123.json': { type: 'asset' as const, fileName: 'assets/words-abc123.json' },
}
const OPTIONS = { vocabulary: /^assets\/words-[\w-]+\.json$/, app: '/src/App.tsx' }
const hrefs = (html = '') => startupTags(BUNDLE, { ...OPTIONS, html }).map((tag) => tag.attrs?.href)

describe('precargas del arranque', () => {
  it('precarga el vocabulario como fetch, con el mismo modo que el fetch() de la app', () => {
    expect(startupTags(BUNDLE, OPTIONS)[0].attrs).toEqual({
      rel: 'preload',
      as: 'fetch',
      type: 'application/json',
      crossorigin: '',
      fetchpriority: 'low',
      href: './assets/words-abc123.json',
    })
  })

  it('el código de la app va con prioridad baja: primero lo que pinta la pantalla', () => {
    const html =
      '<script type="module" crossorigin src="./a.js"></script><link rel="modulepreload" crossorigin href="./b.js">'
    expect(lowerAppPriority(html)).toBe(
      '<script type="module" crossorigin fetchpriority="low" src="./a.js"></script><link rel="modulepreload" crossorigin fetchpriority="low" href="./b.js">',
    )
  })

  it('precarga la app y todo lo que importa, también con rutas de Windows', () => {
    expect(hrefs()).toEqual([
      './assets/words-abc123.json',
      './assets/App.js',
      './assets/shared.js',
      './assets/decks.js',
    ])
  })

  it('no repite lo que el HTML ya precarga', () => {
    expect(hrefs('<link rel="modulepreload" href="./assets/shared.js">')).not.toContain('./assets/shared.js')
  })
})
