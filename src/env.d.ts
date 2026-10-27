/** APIs del navegador que aún no están en lib.dom de TypeScript. */

interface ImportMetaEnv {
  /** Versión de la app (package.json), la inyecta vite.config.ts. */
  readonly APP_VERSION: string
  /** Megas de todas las pronunciaciones, calculados en el build (vite.config.ts). */
  readonly AUDIO_MB: number
}

/** Chrome, Edge y Android ofrecen instalar la PWA con este evento. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Window {
  /** Safari en iOS anterior a 14.5 solo expone Web Audio con prefijo. */
  webkitAudioContext?: typeof AudioContext
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

/** URL del vocabulario compacto que publica vite/vocabulary.ts. */
declare module 'virtual:vocabulary-url' {
  const url: string
  export default url
}

/** Versión de cada pronunciación según su contenido: { id: hash }. Ver vite/audio-versions.ts. */
declare module 'virtual:audio-versions' {
  const versions: Readonly<Record<string, string>>
  export default versions
}

/** Índice del curso: id y título de cada lección, por nivel. Ver vite/course-index.ts. */
declare module 'virtual:course-index' {
  const index: Readonly<Record<'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2', ReadonlyArray<{ id: string; title: string }>>>
  export default index
}

/** Reconocimiento de voz (Web Speech API): lo mínimo que usa src/lib/speech.ts. */
interface TeclaSpeechRecognition {
  lang: string
  maxAlternatives: number
  interimResults: boolean
  /** Sigue escuchando tras una pausa (para leer una frase larga). */
  continuous: boolean
  start(): void
  /** Deja de escuchar y entrega lo oído hasta ahora. */
  stop(): void
  abort(): void
  addEventListener(
    type: 'result',
    listener: (event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void,
  ): void
  addEventListener(type: 'error', listener: (event: { error: string }) => void): void
  addEventListener(type: 'end', listener: () => void): void
}

interface Window {
  /** Chrome y Edge lo exponen con prefijo; Safari, con los dos nombres. */
  SpeechRecognition?: new () => TeclaSpeechRecognition
  webkitSpeechRecognition?: new () => TeclaSpeechRecognition
}
