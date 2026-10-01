import { useSyncExternalStore } from 'react'
import { canSpeak, bestEnglishVoice, speakEnglish } from '@/lib/tts'
import { ReadAloudIcon } from './icons'
import { IconButton } from './ui/IconButton'

/** Avisa cuando el navegador termina de cargar sus voces (Chrome las trae un instante después). */
function subscribeVoices(listener: () => void) {
  if (!canSpeak()) return () => undefined
  window.speechSynthesis.addEventListener('voiceschanged', listener)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', listener)
}
const hasEnglishVoice = () => bestEnglishVoice() !== null

/**
 * Botón para oír una frase en inglés con la voz del navegador. Solo aparece donde hay una voz en
 * inglés; mientras las voces cargan, no se muestra (y aparece solo cuando llegan).
 */
export function SpeakExampleButton({ text, className }: { text: string; className?: string }) {
  const available = useSyncExternalStore(subscribeVoices, hasEnglishVoice, () => false)
  if (!available) return null
  return (
    <IconButton
      label="Escuchar la frase"
      title="Escuchar la frase con la voz del navegador"
      hover="accent"
      onClick={() => speakEnglish(text)}
      className={className}
    >
      <ReadAloudIcon width={18} height={18} />
    </IconButton>
  )
}
