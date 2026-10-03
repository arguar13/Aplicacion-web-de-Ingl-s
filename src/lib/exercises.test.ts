import { describe, expect, it } from 'vitest'
import type { Exercise } from './course'
import {
  correctAnswer,
  judgeExercise,
  judgeQuestions,
  judgeSentence,
  normalizeSentence,
  optionOrder,
  scoreOf,
  shuffledWords,
  skillBreakdown,
} from './exercises'

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
    // Las contracciones sin ambigüedad valen igual que la forma completa, en los dos sentidos.
    expect(judgeSentence('You should have booked earlier.', ["You should've booked earlier."])).toBe('correct')
    expect(judgeSentence("I can't swim", ['I cannot swim.'])).toBe('correct')
    expect(judgeSentence("They won't come", ['They will not come.'])).toBe('correct')
    expect(judgeSentence("She doesn't know", ['She does not know.'])).toBe('correct')
    // «'s» puede ser is, has o posesivo: no se desarrolla, así que no se confunde con otra cosa.
    expect(judgeSentence("He's gone", ['He is gone.'])).toBe('wrong')
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

  it('comprensión: todas bien es correcto; una mal de tres o más es «casi»', () => {
    const questions = [{ answer: 0 }, { answer: 1 }, { answer: 2 }]
    expect(judgeQuestions(questions, [0, 1, 2])).toBe('correct')
    expect(judgeQuestions(questions, [0, 1, 0])).toBe('almost')
    expect(judgeQuestions(questions, [1, 0, 2])).toBe('wrong')
    expect(judgeQuestions([{ answer: 0 }, { answer: 1 }], [0, 0])).toBe('wrong')
    expect(judgeQuestions(questions, [])).toBe('wrong')
    const reading: Exercise = {
      type: 'reading',
      title: 'Nota',
      text: 'Ana works at a bank. She starts at nine.',
      questions: [{ prompt: 'Where does Ana work?', options: ['At a bank', 'At a school'], answer: 0 }],
    }
    expect(judgeExercise(reading, [0])).toBe('correct')
    expect(judgeExercise(reading, 'bank')).toBe('wrong')
    expect(correctAnswer(reading)).toBe('1. At a bank')
  })

  it('baraja las palabras de forma estable y nunca en el orden correcto', () => {
    const words = ['She', 'is', 'a', 'doctor.']
    const first = shuffledWords(words, 7)
    expect(first).toEqual(shuffledWords(words, 7))
    expect(first.toSorted()).toEqual(words.toSorted())
    for (let seed = 0; seed < 50; seed++) expect(shuffledWords(words, seed).join(' ')).not.toBe(words.join(' '))
    expect(shuffledWords(['a', 'b'], 3)).toEqual(['b', 'a'])
  })

  it('transformación: vale la respuesta con o sin contracción; la corrección muestra la frase entera', () => {
    const transform: Exercise = {
      type: 'transform',
      original: "It wasn't necessary for you to come.",
      keyword: 'NEED',
      prompt: 'You ___ come.',
      answers: ["needn't have", 'need not have'],
    }
    expect(judgeExercise(transform, 'need not have')).toBe('correct')
    expect(judgeExercise(transform, 'Needn’t have')).toBe('correct')
    expect(judgeExercise(transform, "didn't need to")).toBe('wrong')
    expect(correctAnswer(transform)).toBe("You needn't have come.")
  })

  it('encuentra el error: vale la parte equivocada, y la corrección deja la frase bien', () => {
    const spot: Exercise = {
      type: 'spot',
      parts: ['My sister', "don't", 'like', 'horror films.'],
      answer: 1,
      correction: "doesn't",
    }
    expect(judgeExercise(spot, 1)).toBe('correct')
    expect(judgeExercise(spot, 0)).toBe('wrong')
    expect(correctAnswer(spot)).toBe("My sister doesn't like horror films.")
  })

  it('las opciones se muestran barajadas, siempre igual para la misma pregunta', () => {
    const options = ['go', 'goes', 'going', 'gone']
    const order = optionOrder(options, 'She ___ to work.')
    expect(order.toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3])
    expect(optionOrder(options, 'She ___ to work.')).toEqual(order)
    // Con muchas preguntas, la correcta (aquí la 1) cae en todas las posiciones.
    const positions = new Set(Array.from({ length: 40 }, (_, i) => optionOrder(options, `Pregunta ${i}`).indexOf(1)))
    expect(positions.size).toBe(4)
  })

  it('el desglose por destrezas cuenta cada tipo en la suya', () => {
    const exercises: Exercise[] = [
      { type: 'choice', prompt: 'a', options: ['x', 'y', 'z'], answer: 0 },
      { type: 'translate', es: 'b', answers: ['b'] },
      { type: 'spot', parts: ['a', 'b', 'c'], answer: 0, correction: 'd' },
    ]
    expect(skillBreakdown(exercises, ['correct', 'wrong', 'almost'])).toEqual([
      { skill: 'use', correct: 2, total: 2, ratio: 1 },
      { skill: 'writing', correct: 0, total: 1, ratio: 0 },
    ])
  })

  it('la nota cuenta los «casi» como aciertos', () => {
    expect(scoreOf(['correct', 'almost', 'wrong', 'correct'])).toEqual({ correct: 2, almost: 1, total: 4, ratio: 0.75 })
    expect(scoreOf([])).toEqual({ correct: 0, almost: 0, total: 0, ratio: 0 })
  })
})
