/**
 * Pronunciaciones.
 *
 * Se usa Web Audio: Safari en iPhone/iPad solo deja sonar un <audio> si play() ocurre dentro de un
 * toque, así que la palabra no sonaría al aparecer. Un AudioContext, en cambio, se desbloquea una
 * vez con el primer gesto y a partir de ahí puede sonar cuando queramos, con menos latencia.
 *
 * Donde no hay Web Audio (iOS antiguo solo tiene `webkitAudioContext`; algunos navegadores
 * restringidos, ninguno) se usa un elemento <audio>: suena al tocar, sin errores.
 */
import { audioUrl } from './audioUrl'

/** Audios decodificados que se guardan en memoria (~200 KB cada uno). */
const MAX_CACHED = 40
/** Velocidad de "escuchar despacio". */
export const SLOW_RATE = 0.7

const AudioContextClass: typeof AudioContext | undefined =
  typeof window === 'undefined' ? undefined : (window.AudioContext ?? window.webkitAudioContext)

let context: AudioContext | null = null
let current: AudioBufferSourceNode | null = null
let currentElement: HTMLAudioElement | null = null
let playToken = 0
const buffers = new Map<string, Promise<AudioBuffer | null>>()

function getContext(Context: typeof AudioContext): AudioContext {
  if (!context) {
    // En iOS hace que suene aunque el interruptor de silencio esté activado, como un reproductor.
    if (navigator.audioSession) navigator.audioSession.type = 'playback'
    context = new Context()
  }
  return context
}

if (AudioContextClass) {
  const Context = AudioContextClass
  const unlock = () => {
    const ctx = getContext(Context)
    if (ctx.state === 'suspended') void ctx.resume()
  }
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) {
    window.addEventListener(type, unlock, { capture: true, passive: true })
  }
}

function load(id: string, Context: typeof AudioContext): Promise<AudioBuffer | null> {
  const cached = buffers.get(id)
  if (cached) {
    // Reinsertar la mueve al final: la caché descarta las menos usadas recientemente.
    buffers.delete(id)
    buffers.set(id, cached)
    return cached
  }

  const promise = audioUrl(id)
    .then((url) => fetch(url))
    .then((res) => {
      if (!res.ok) throw new Error(`Audio no encontrado: ${id}`)
      return res.arrayBuffer()
    })
    .then((data) => getContext(Context).decodeAudioData(data))
    .catch((error: unknown) => {
      // Sin red y sin copia offline: la palabra se muestra igual, solo que sin sonido.
      console.warn(`No se pudo cargar la pronunciación de "${id}"`, error)
      buffers.delete(id)
      return null
    })

  buffers.set(id, promise)
  if (buffers.size > MAX_CACHED) {
    const oldest = buffers.keys().next()
    if (!oldest.done) buffers.delete(oldest.value)
  }
  return promise
}

/** Descarga (y con Web Audio, decodifica) el audio de antemano para que suene sin espera. */
export function preloadPronunciation(id: string): void {
  if (AudioContextClass) void load(id, AudioContextClass)
  else void audioUrl(id).then((url) => fetch(url))
}

export interface PlayOptions {
  /** Más despacio y con el mismo tono (un <audio> con preservesPitch; Web Audio lo haría más grave). */
  slow?: boolean
}

export async function playPronunciation(id: string, { slow = false }: PlayOptions = {}): Promise<void> {
  const token = ++playToken
  stopCurrent()
  if (slow || !AudioContextClass) return playWithElement(id, token, slow ? SLOW_RATE : 1)

  const ctx = getContext(AudioContextClass)
  const buffer = await load(id, AudioContextClass)
  // Si mientras cargaba se pidió otra palabra, esta ya no debe sonar.
  if (!buffer || token !== playToken) return
  if (ctx.state === 'suspended') await ctx.resume()

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.addEventListener(
    'ended',
    () => {
      if (current === source) current = null
    },
    { once: true },
  )
  source.start()
  current = source
}

/** Corta lo que esté sonando, venga de Web Audio o de un elemento <audio>. */
function stopCurrent() {
  current?.stop()
  current = null
  currentElement?.pause()
  currentElement = null
}

async function playWithElement(id: string, token: number, rate: number): Promise<void> {
  const url = await audioUrl(id)
  if (token !== playToken) return
  const element = new Audio(url)
  element.preservesPitch = true
  element.playbackRate = rate
  currentElement = element
  try {
    await element.play()
  } catch (error) {
    // Sin Web Audio, el navegador bloquea el sonido que no nace de un toque (autoplay): es
    // esperado. Otro fallo (sin red ni copia offline) deja la palabra sin sonido, como en load().
    if (!(error instanceof DOMException && error.name === 'NotAllowedError')) {
      console.warn(`No se pudo reproducir la pronunciación de "${id}"`, error)
    }
  }
}
