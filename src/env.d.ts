/** APIs del navegador que aún no están en lib.dom de TypeScript. */

/** Chrome, Edge y Android ofrecen instalar la PWA con este evento. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}

interface Navigator {
  /** Safari en iOS: true cuando la web se abrió desde la pantalla de inicio. */
  readonly standalone?: boolean
  /** Audio Session API (Safari): permite que suene aunque el iPhone esté en silencio. */
  readonly audioSession?: { type: 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record' }
}

/** Versión de cada pronunciación según su contenido: { id: hash }. Ver vite/audio-versions.ts. */
declare module 'virtual:audio-versions' {
  const versions: Readonly<Record<string, string>>
  export default versions
}
