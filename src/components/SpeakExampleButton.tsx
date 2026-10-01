import { useSyncExternalStore } from 'react'
import { playPronunciation } from '@/lib/audio'
import { useRecordedSentence } from '@/lib/courseAudio'
import { bestEnglishVoice, canSpeak, speakEnglish } from '@/lib/tts'
import { ReadAloudIcon, SpeakerIcon } from './icons'
import { IconButton } from './ui/IconButton'

/** Avisa cuando el navegador termina de cargar sus voces (Chrome las trae un instante después). */
function subscribeVoices(listener: () => void) {
  if (!canSpeak()) return () => undefined
  window.speechSynthesis.addEventListener('voiceschanged', listener)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', listener)
}
const hasEnglishVoice = () => bestEnglishVoice() !== null

/**
 * Botón para oír una frase en inglés. Si la frase tiene grabación (voz neuronal, ver
 * scripts/generate_course_audio.py) suena esa; si no, la lee la voz del navegador, y solo aparece
 * donde haya una voz en inglés.
 */
export function SpeakExampleButton({ text, className }: { text: string; className?: string }) {
  const recorded = useRecordedSentence(text)
  const voice = useSyncExternalStore(subscribeVoices, hasEnglishVoice, () => false)
  if (recorded) {
    return (
      <IconButton
        label="Escuchar la frase"
        title="Escuchar la frase"
        hover="accent"
        onClick={() => void playPronunciation(recorded)}
        className={className}
      >
        <SpeakerIcon width={18} height={18} />
      </IconButton>
    )
  }
  if (!voice) return null
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
