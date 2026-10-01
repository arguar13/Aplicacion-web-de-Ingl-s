import { describe, expect, it } from 'vitest'
import { courseAudioId, normalizeSentence, recordedCourseIds } from './courseAudio'

describe('audio grabado del curso', () => {
  it('el id de cada frase coincide con el que calcula scripts/generate_course_audio.py', () => {
    // Valores calculados con el script (misma función FNV-1a sobre UTF-8, mismas semillas).
    expect(courseAudioId('I am a student.')).toBe('course/d542072491814dd3')
    expect(courseAudioId('  Can I have a glass of water?  ')).toBe('course/808d4b385f613189')
    expect(courseAudioId('She’s from México.')).toBe('course/1c778693920cc3b8')
  })

  it('los espacios de más no cambian el id; una letra sí', () => {
    expect(courseAudioId('I am  a student.')).toBe(courseAudioId('I am a student.'))
    expect(courseAudioId('I am a teacher.')).not.toBe(courseAudioId('I am a student.'))
    expect(normalizeSentence('  a   b ')).toBe('a b')
  })

  it('distingue las grabaciones del curso de las pronunciaciones de palabras', () => {
    expect(recordedCourseIds({ water: 'abc', 'course/d542072491814dd3': 'def' })).toEqual(['course/d542072491814dd3'])
  })
})
