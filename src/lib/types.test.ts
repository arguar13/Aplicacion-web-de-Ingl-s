import { describe, expect, it } from 'vitest'
import { answerLanguage, isTypedMode, MODES, trackOf } from './types'

describe('modos y habilidades', () => {
  it('cada modo refuerza una habilidad con progreso propio', () => {
    expect(trackOf('en-es')).toBe('en-es')
    expect(trackOf('cloze')).toBe('en-es')
    expect(trackOf('flash')).toBe('en-es')
    expect(trackOf('dictation')).toBe('type')
    expect(trackOf('listen')).toBe('listen')
  })

  it('la respuesta se escribe en escribir y dictado; en los demás se elige o se muestra', () => {
    expect(MODES.filter(isTypedMode)).toEqual(['type', 'dictation'])
    expect(answerLanguage('flash')).toBe('es')
    expect(answerLanguage('dictation')).toBe('en')
    expect(answerLanguage('es-en')).toBe('en')
  })
})
