import { describe, expect, it } from 'vitest'
import { englishVoices } from './tts'

const voice = (name: string, lang: string) =>
  ({ name, lang, default: false, localService: true, voiceURI: name }) satisfies SpeechSynthesisVoice

describe('leer en voz alta', () => {
  it('se queda con las voces en inglés y pone primero las más naturales y estadounidenses', () => {
    const voices = [
      voice('Mónica', 'es-ES'),
      voice('Daniel', 'en-GB'),
      voice('Google US English', 'en-US'),
      voice('Microsoft Aria Online (Natural) - English (United States)', 'en-US'),
      voice('Samantha', 'en-US'),
      voice('Alex', 'en_US'),
    ]
    expect(englishVoices(voices).map((v) => v.name)).toEqual([
      'Microsoft Aria Online (Natural) - English (United States)',
      'Google US English',
      'Samantha',
      'Alex',
      'Daniel',
    ])
  })

  it('sin voces en inglés, no hay nada que elegir', () => {
    expect(englishVoices([voice('Mónica', 'es-ES')])).toEqual([])
  })
})
