/**
 * Pronunciaciones con Web Audio.
 *
 * Safari en iPhone/iPad solo deja sonar un <audio> si play() ocurre dentro de un toque, así que la
 * palabra no sonaría al aparecer. Un AudioContext, en cambio, se desbloquea una vez con el primer
 * gesto y a partir de ahí puede sonar cuando queramos, con menos latencia.
 */

/** Audios decodificados que se guardan en memoria (~200 KB cada uno). */
const MAX_CACHED = 40

let context: AudioContext | null = null
let current: AudioBufferSourceNode | null = null
let playToken = 0
const buffers = new Map<string, Promise<AudioBuffer | null>>()

function getContext(): AudioContext {
  if (!context) {
    // En iOS hace que suene aunque el interruptor de silencio esté activado, como un reproductor.
    const nav = navigator as Navigator & { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'playback'
    context = new AudioContext()
  }
  return context
}

function unlock() {
  const ctx = getContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) {
    window.addEventListener(type, unlock, { capture: true, passive: true })
  }
}

function load(id: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(id)
  if (cached) {
    // Reinsertar la mueve al final: la caché descarta las menos usadas recientemente.
    buffers.delete(id)
    buffers.set(id, cached)
    return cached
  }

  const promise = fetch(`${import.meta.env.BASE_URL}audio/${id}.mp3`)
    .then((res) => {
      if (!res.ok) throw new Error(`Audio no encontrado: ${id}`)
      return res.arrayBuffer()
    })
    .then((data) => getContext().decodeAudioData(data))
    .catch(() => {
      buffers.delete(id)
      return null
    })

  buffers.set(id, promise)
  if (buffers.size > MAX_CACHED) buffers.delete(buffers.keys().next().value!)
  return promise
}

/** Descarga y decodifica el audio de antemano para que suene sin espera. */
export function preloadPronunciation(id: string): void {
  void load(id)
}

export async function playPronunciation(id: string): Promise<void> {
  const token = ++playToken
  const ctx = getContext()
  const buffer = await load(id)
  // Si mientras cargaba se pidió otra palabra, esta ya no debe sonar.
  if (!buffer || token !== playToken) return
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {})

  try {
    current?.stop()
  } catch {
    // Ya había terminado.
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
  current = source
}
