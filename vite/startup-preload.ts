/**
 * Plugin de Vite: arranque sin cascada de descargas.
 *
 * main.tsx espera al vocabulario (un JSON aparte) y solo entonces importa la app, para que los
 * módulos que lo usan al cargarse lo encuentren listo. Sin ayuda, eso serían dos descargas en fila.
 * Este plugin las pone en paralelo desde el HTML: precarga el vocabulario (`preload as=fetch`) y los
 * módulos de la app (`modulepreload`: se descargan y compilan, pero no se ejecutan hasta el import).
 */
import type { HtmlTagDescriptor, Plugin } from 'vite'

/** Precargas para el HTML a partir del bundle: el JSON del vocabulario y la app con sus módulos. */
export function startupTags(
  bundle: Record<
    string,
    { type: 'chunk' | 'asset'; fileName: string; facadeModuleId?: string | null; imports?: string[] }
  >,
  { vocabulary, app, html = '' }: { vocabulary: RegExp; app: string; html?: string },
): HtmlTagDescriptor[] {
  const files = Object.values(bundle)
  const tags: HtmlTagDescriptor[] = []
  const words = files.find((file) => file.type === 'asset' && vocabulary.test(file.fileName))
  if (words) {
    tags.push({
      tag: 'link',
      // `crossorigin` igual que el fetch() (modo cors, credenciales del mismo origen): si no
      // coinciden, el navegador descarta la precarga y vuelve a pedir el archivo.
      attrs: {
        rel: 'preload',
        as: 'fetch',
        type: 'application/json',
        crossorigin: '',
        fetchpriority: 'low',
        href: `./${words.fileName}`,
      },
      injectTo: 'head',
    })
  }
  const entry = files.find((file) => file.type === 'chunk' && file.facadeModuleId?.replaceAll('\\', '/').endsWith(app))
  const seen = new Set<string>()
  const visit = (fileName: string) => {
    if (seen.has(fileName)) return
    seen.add(fileName)
    for (const imported of bundle[fileName]?.imports ?? []) visit(imported)
  }
  if (entry) visit(entry.fileName)
  // Las que Vite ya precarga (las del propio main.tsx) no se repiten.
  for (const fileName of [...seen].filter((name) => !html.includes(name))) {
    tags.push({
      tag: 'link',
      attrs: { rel: 'modulepreload', crossorigin: '', fetchpriority: 'low', href: `./${fileName}` },
      injectTo: 'head',
    })
  }
  return tags
}

/**
 * El código y los datos de la app, con prioridad baja: se piden enseguida, pero primero va lo que
 * pinta la pantalla (HTML, CSS y, para quien entra por primera vez, la bienvenida ya dibujada).
 */
export function lowerAppPriority(html: string): string {
  return html
    .replace(/<script type="module" crossorigin/g, '<script type="module" crossorigin fetchpriority="low"')
    .replace(
      /<link rel="modulepreload" crossorigin href/g,
      '<link rel="modulepreload" crossorigin fetchpriority="low" href',
    )
}

export function startupPreload(): Plugin {
  return {
    name: 'tecla-startup-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html, context) => ({
        html: lowerAppPriority(html),
        tags: context.bundle
          ? startupTags(context.bundle, {
              vocabulary: /^assets\/words-[\w-]+\.json$/,
              app: '/src/App.tsx',
              html,
            })
          : [],
      }),
    },
  }
}
