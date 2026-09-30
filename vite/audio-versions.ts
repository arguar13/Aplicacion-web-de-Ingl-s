/**
 * Plugin de Vite: versión de cada pronunciación según su contenido.
 *
 * Expone `virtual:audio-versions` ({ id: hash }) para pedir `audio/<id>.mp3?v=<hash>`. Si un audio
 * se regenera, su URL cambia y llega a todos al instante, aunque la versión anterior esté en la
 * caché del navegador o del service worker. Así los MP3 pueden cachearse como inmutables.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:audio-versions'
const RESOLVED_ID = `\0${VIRTUAL_ID}`
/** 8 hex = 32 bits: basta para distinguir dos versiones del mismo archivo. */
const HASH_LENGTH = 8
/** Calma tras el último cambio de audio antes de recalcular las versiones (en desarrollo). */
const REFRESH_DELAY_MS = 1500

export function computeAudioVersions(dir: string): Record<string, string> {
  const versions: Record<string, string> = {}
  for (const file of readdirSync(dir).toSorted()) {
    if (!file.endsWith('.mp3')) continue
    const hash = createHash('sha256')
      .update(readFileSync(join(dir, file)))
      .digest('hex')
    versions[file.slice(0, -'.mp3'.length)] = hash.slice(0, HASH_LENGTH)
  }
  return versions
}

export function audioVersions(dir: string): Plugin {
  return {
    name: 'tecla-audio-versions',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      return `export default ${JSON.stringify(computeAudioVersions(dir))}`
    },
    configureServer(server) {
      // En desarrollo, un audio nuevo o regenerado actualiza las versiones sin reiniciar.
      server.watcher.add(dir)
      // Al regenerar el audio llegan miles de cambios seguidos: se agrupan y se recalcula una vez
      // cuando se calman (si no, cada archivo volvería a leer todos los demás y recargaría la página).
      let timer: ReturnType<typeof setTimeout> | undefined
      const refresh = (file: string) => {
        if (!normalize(file).startsWith(normalize(dir)) || !file.endsWith('.mp3')) return
        clearTimeout(timer)
        timer = setTimeout(() => {
          const module = server.moduleGraph.getModuleById(RESOLVED_ID)
          if (module) server.moduleGraph.invalidateModule(module)
          server.ws.send({ type: 'full-reload' })
        }, REFRESH_DELAY_MS)
      }
      server.watcher.on('add', refresh)
      server.watcher.on('change', refresh)
      server.watcher.on('unlink', refresh)
    },
  }
}
