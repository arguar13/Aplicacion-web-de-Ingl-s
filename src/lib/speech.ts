/**
 * Pronunciar con la voz: el reconocimiento de voz del propio navegador (Web Speech API), sin
 * servidor ni costo. Chrome y Edge lo hacen en línea con su servicio; Safari, en el dispositivo.
 * Donde no existe (Firefox), la función no se ofrece.
 */
import { judgeTyped } from './typing'

function recognitionClass() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export const canRecognizeSpeech = () => recognitionClass() !== null

/**
 * ¿Se dijo la palabra? Vale cualquiera de las alternativas que propone el reconocedor, sola o dentro
 * de lo oído ("the water"), y con la misma tolerancia que al escribirla (un error en palabras de 4
 * letras o más: el reconocedor también se equivoca).
 */
export function matchesSpoken(target: string, heard: readonly string[]): boolean {
  return heard.some((phrase) => {
    const words = phrase
      .toLowerCase()
      .split(/[^a-z'-]+/)
      .filter(Boolean)
    return judgeTyped(phrase, target) !== 'wrong' || words.some((word) => judgeTyped(word, target) !== 'wrong')
  })
}

export type ListenResult = { ok: boolean; heard: string[] } | { error: 'no-speech' | 'denied' | 'failed' }

/** Escucha una vez (hasta que se deja de hablar) y dice si se pronunció `target`. */
export function listenFor(target: string): { result: Promise<ListenResult>; cancel: () => void } {
  const Recognition = recognitionClass()
  if (!Recognition) return { result: Promise.resolve({ error: 'failed' }), cancel: () => undefined }
  const recognition = new Recognition()
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 5
  recognition.interimResults = false
  const result = new Promise<ListenResult>((resolve) => {
    let settled = false
    const finish = (value: ListenResult) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    recognition.addEventListener('result', (event) => {
      const heard = Array.from(event.results[0] ?? [], (alternative) => alternative.transcript.trim())
      finish({ ok: matchesSpoken(target, heard), heard })
    })
    recognition.addEventListener('error', (event) => {
      const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed'
      finish({ error: denied ? 'denied' : event.error === 'no-speech' ? 'no-speech' : 'failed' })
    })
    // Sin resultado ni error (se dejó de escuchar sin oír nada).
    recognition.addEventListener('end', () => finish({ error: 'no-speech' }))
  })
  recognition.start()
  return { result, cancel: () => recognition.abort() }
}
