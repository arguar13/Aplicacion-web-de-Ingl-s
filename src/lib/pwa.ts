/** Instalación como app y audio sin conexión. */
import { useSyncExternalStore } from 'react'
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

/** El audio sin conexión depende del service worker, que solo existe en el build de producción. */
export const offlineAudioSupported = () =>
  typeof window !== 'undefined' && 'caches' in window && !!navigator.serviceWorker?.controller

export async function countCachedAudio(): Promise<number> {
  if (!offlineAudioSupported()) return 0
  const cache = await caches.open(AUDIO_CACHE)
  return (await cache.keys()).length
}

/**
 * Descarga y guarda las pronunciaciones que falten. Se guardan aquí mismo y no se deja en manos
 * del service worker: así, al terminar, todas están de verdad en la caché. Se puede cancelar con
 * `signal`.
 */
const audioUrl = (id: string) => new URL(`${import.meta.env.BASE_URL}audio/${id}.mp3`, location.href).href

export async function downloadAudio(
  ids: readonly string[],
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const cache = await caches.open(AUDIO_CACHE)
  const cached = new Set((await cache.keys()).map((request) => request.url))
  const pending = ids.filter((id) => !cached.has(audioUrl(id)))

  let done = ids.length - pending.length
  onProgress(done)

  await runPool(
    pending,
    CONCURRENCY,
    async (id) => {
      try {
        const response = await fetch(audioUrl(id), { signal })
        if (response.ok) await cache.put(audioUrl(id), response)
      } catch {
        // Sin red o cancelado: esa pronunciación queda para la próxima descarga.
        if (signal.aborted) return
      }
      onProgress(++done)
    },
    signal,
  )
}
