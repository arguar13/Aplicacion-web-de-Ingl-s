/** Instalación como app y audio sin conexión. */
import { useSyncExternalStore } from 'react'

// --- Instalación --------------------------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installPrompt: BeforeInstallPromptEvent | null = null
const installListeners = new Set<() => void>()
const emitInstall = () => installListeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  // Chrome/Edge/Android ofrecen instalar mediante este evento; se guarda para lanzarlo desde Ajustes.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event as BeforeInstallPromptEvent
    emitInstall()
  })
  window.addEventListener('appinstalled', () => {
    installPrompt = null
    emitInstall()
  })
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone/iPad no tienen el evento de instalación: se instala desde el menú Compartir de Safari. */
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export function useInstallPrompt() {
  const available = useSyncExternalStore(
    (listener) => {
      installListeners.add(listener)
      return () => installListeners.delete(listener)
    },
    () => installPrompt !== null,
    () => false,
  )

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    installPrompt = null
    emitInstall()
  }

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
export async function downloadAudio(
  ids: readonly string[],
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const cache = await caches.open(AUDIO_CACHE)
  const url = (id: string) => new URL(`${import.meta.env.BASE_URL}audio/${id}.mp3`, location.href).href
  const cached = new Set((await cache.keys()).map((request) => request.url))
  const pending = ids.filter((id) => !cached.has(url(id)))

  let done = ids.length - pending.length
  onProgress(done)

  let next = 0
  async function worker() {
    while (next < pending.length && !signal.aborted) {
      const id = pending[next++]
      try {
        const response = await fetch(url(id), { signal })
        if (response.ok) await cache.put(url(id), response)
      } catch {
        if (signal.aborted) return
      }
      onProgress(++done)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}
