/** Instalación como app y audio sin conexión. */
import { useSyncExternalStore } from 'react'
import { loadAudioVersions, versionedAudioUrl } from './audioUrl'
import { runPool } from './pool'

// --- Instalación --------------------------------------------------------------------------------

let installPrompt: BeforeInstallPromptEvent | null = null
const installListeners = new Set<() => void>()
const emitInstall = () => installListeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  // Chrome/Edge/Android ofrecen instalar mediante este evento; se guarda para lanzarlo desde Ajustes.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event
    emitInstall()
  })
  window.addEventListener('appinstalled', () => {
    installPrompt = null
    emitInstall()
  })
}

const subscribeInstall = (listener: () => void) => {
  installListeners.add(listener)
  return () => {
    installListeners.delete(listener)
  }
}

async function install() {
  if (!installPrompt) return
  await installPrompt.prompt()
  await installPrompt.userChoice
  installPrompt = null
  emitInstall()
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

/** iPhone/iPad no tienen el evento de instalación: se instala desde el menú Compartir de Safari. */
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export function useInstallPrompt() {
  const available = useSyncExternalStore(
    subscribeInstall,
    () => installPrompt !== null,
    () => false,
  )
  return { available, install }
}

// --- Audio sin conexión -------------------------------------------------------------------------

/** Debe coincidir con runtimeCaching.cacheName en vite.config.ts. */
const AUDIO_CACHE = 'tecla-audio'
const CONCURRENCY = 12

const hasServiceWorker = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator

const subscribeController = (listener: () => void) => {
  if (!hasServiceWorker()) return () => undefined
  navigator.serviceWorker.addEventListener('controllerchange', listener)
  return () => navigator.serviceWorker.removeEventListener('controllerchange', listener)
}

/**
 * El audio sin conexión necesita un service worker que controle la página (solo existe en el build
 * de producción). Con `clientsClaim` lo hace ya en la primera visita; el hook se actualiza en cuanto
 * toma el control, sin recargar.
 */
export function useOfflineAudioSupported(): boolean {
  return useSyncExternalStore(
    subscribeController,
    () => hasServiceWorker() && 'caches' in window && navigator.serviceWorker.controller !== null,
    () => false,
  )
}

/** Pronunciaciones guardadas en su versión actual. */
export async function countCachedAudio(ids: readonly string[]): Promise<number> {
  if (!('caches' in window)) return 0
  const [cache, versions] = await Promise.all([caches.open(AUDIO_CACHE), loadAudioVersions()])
  const cached = new Set((await cache.keys()).map((request) => request.url))
  return ids.filter((id) => cached.has(versionedAudioUrl(id, versions))).length
}

/**
 * Borra de la caché las pronunciaciones que ya no están en su versión actual (se regeneraron o la
 * palabra dejó de existir): cada versión nueva es una URL distinta y la antigua ocuparía espacio.
 */
export async function pruneStaleAudio(ids: readonly string[]): Promise<number> {
  if (!('caches' in window) || !(await caches.has(AUDIO_CACHE))) return 0
  const [cache, versions] = await Promise.all([caches.open(AUDIO_CACHE), loadAudioVersions()])
  const current = new Set(ids.map((id) => versionedAudioUrl(id, versions)))
  const stale = (await cache.keys()).filter((request) => !current.has(request.url))
  await Promise.all(stale.map((request) => cache.delete(request)))
  return stale.length
}

/**
 * Descarga y guarda las pronunciaciones que falten. Se guardan aquí mismo y no se deja en manos
 * del service worker: así, al terminar, todas están de verdad en la caché. Se puede cancelar con
 * `signal`.
 */
export async function downloadAudio(
  ids: readonly string[],
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const [cache, versions] = await Promise.all([caches.open(AUDIO_CACHE), loadAudioVersions()])
  const cached = new Set((await cache.keys()).map((request) => request.url))
  const pending = ids.map((id) => versionedAudioUrl(id, versions)).filter((url) => !cached.has(url))

  let done = ids.length - pending.length
  onProgress(done)

  await runPool(
    pending,
    CONCURRENCY,
    async (url) => {
      try {
        const response = await fetch(url, { signal })
        if (response.ok) await cache.put(url, response)
      } catch {
        // Sin red o cancelado: esa pronunciación queda para la próxima descarga.
        if (signal.aborted) return
      }
      onProgress(++done)
    },
    signal,
  )
}
