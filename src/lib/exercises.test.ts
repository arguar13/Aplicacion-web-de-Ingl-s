import { describe, expect, it } from 'vitest'
import type { Exercise } from './course'
import { correctAnswer, judgeExercise, judgeSentence, normalizeSentence, scoreOf, shuffledWords } from './exercises'

describe('corrección de ejercicios', () => {
  it('normaliza las frases: mayúsculas, puntuación final, espacios y apóstrofos', () => {
    expect(normalizeSentence('  She doesn’t  like tea. ')).toBe("she doesn't like tea")
    expect(normalizeSentence('Where are you from?')).toBe('where are you from')
    expect(normalizeSentence('"I am here", he said!')).toBe('i am here, he said')
  })

  it('una traducción vale si coincide con alguna respuesta; un error de tecleo en frases largas es «casi»', () => {
    const answers = ['I have lived here for ten years.', 'I’ve lived here for ten years.']
    expect(judgeSentence('i have lived here for ten years', answers)).toBe('correct')
    expect(judgeSentence("I've lived here for ten years!", answers)).toBe('correct')
    expect(judgeSentence('I have lived here for ten yeers.', answers)).toBe('almost')
    expect(judgeSentence('I live here.', answers)).toBe('wrong')
    expect(judgeSentence('', answers)).toBe('wrong')
    // En frases cortas no se perdona nada: un error cambia la palabra.
    expect(judgeSentence('I am her', ['I am here'])).toBe('wrong')
  })

  it('corrige cada tipo de ejercicio', () => {
    const choice: Exercise = { type: 'choice', prompt: 'She ___ a teacher.', options: ['is', 'are', 'am'], answer: 0 }
    const fill: Exercise = { type: 'fill', prompt: 'They ___ happy.', answers: ['are', "'re"] }
    const order: Exercise = { type: 'order', es: 'Ella es médica.', words: ['She', 'is', 'a', 'doctor.'] }
    const translate: Exercise = { type: 'translate', es: 'Tengo dos hermanos.', answers: ['I have two brothers.'] }
    expect(judgeExercise(choice, 0)).toBe('correct')
    expect(judgeExercise(choice, 1)).toBe('wrong')
    expect(judgeExercise(choice, 'is')).toBe('wrong')
    expect(judgeExercise(fill, 'Are')).toBe('correct')
    expect(judgeExercise(fill, 'is')).toBe('wrong')
    expect(judgeExercise(order, ['She', 'is', 'a', 'doctor.'])).toBe('correct')
    expect(judgeExercise(order, ['She', 'a', 'is', 'doctor.'])).toBe('wrong')
    expect(judgeExercise(translate, 'I have two brothers')).toBe('correct')
    expect(correctAnswer(choice)).toBe('is')
    expect(correctAnswer(fill)).toBe('They are happy.')
    expect(correctAnswer(order)).toBe('She is a doctor.')
    expect(correctAnswer(translate)).toBe('I have two brothers.')
  })

  it('baraja las palabras de forma estable y nunca en el orden correcto', () => {
    const words = ['She', 'is', 'a', 'doctor.']
    const first = shuffledWords(words, 7)
    expect(first).toEqual(shuffledWords(words, 7))
    expect(first.toSorted()).toEqual(words.toSorted())
    for (let seed = 0; seed < 50; seed++) expect(shuffledWords(words, seed).join(' ')).not.toBe(words.join(' '))
    expect(shuffledWords(['a', 'b'], 3)).toEqual(['b', 'a'])
  })

  it('la nota cuenta los «casi» como aciertos', () => {
    expect(scoreOf(['correct', 'almost', 'wrong', 'correct'])).toEqual({ correct: 2, almost: 1, total: 4, ratio: 0.75 })
    expect(scoreOf([])).toEqual({ correct: 0, almost: 0, total: 0, ratio: 0 })
  })
})
