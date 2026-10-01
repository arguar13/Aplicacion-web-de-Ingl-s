/**
 * Leer en voz alta con la voz del navegador (Web Speech API, síntesis): para las frases de ejemplo,
 * que no tienen audio grabado. Sin servidor ni descarga; en la mayoría de los dispositivos funciona
 * sin conexión. Donde no hay voces en inglés, la función no se ofrece.
 */

/** Voces preferidas, de mejor a peor: las neuronales de cada sistema suenan mucho más naturales. */
const PREFERRED = [
  /natural/i,
  /premium/i,
  /enhanced/i,
  /google us english/i,
  /samantha/i,
  /^microsoft .*(aria|jenny|guy)/i,
]

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Menor = mejor: primero la calidad de la voz, luego el acento estadounidense. */
function voiceScore(voice: SpeechSynthesisVoice): number {
  const preference = PREFERRED.findIndex((pattern) => pattern.test(voice.name))
  const quality = preference === -1 ? PREFERRED.length : preference
  const american = /^en[-_]us$/i.test(voice.lang) ? 0 : 1
  return quality * 2 + american
}

/** Voces en inglés disponibles, de la más natural a la más básica (las estadounidenses primero). */
export function englishVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((voice) => /^en([-_]|$)/i.test(voice.lang)).toSorted((a, b) => voiceScore(a) - voiceScore(b))
}

/** La mejor voz en inglés que tiene el navegador, o null si no hay ninguna. */
export function bestEnglishVoice(): SpeechSynthesisVoice | null {
  if (!canSpeak()) return null
  return englishVoices(window.speechSynthesis.getVoices())[0] ?? null
}

/**
 * Lee el texto en inglés (despacio si se pide). Corta lo que estuviera sonando. Devuelve false si
 * el navegador no tiene voz en inglés.
 */
export function speakEnglish(text: string, { slow = false } = {}): boolean {
  const voice = bestEnglishVoice()
  if (!voice) return false
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = slow ? 0.7 : 0.95
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  return true
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
