import { describe, expect, it } from 'vitest'
import raw from '@/data/texts.json'
import { COURSE_LEVELS } from './courseMeta'
import { listeningMinutes, parseTexts, sentencesOf, TEXT_COUNT, wordCount } from './texts'

const TEXTS = parseTexts(raw)

function averageWords(level: string): number {
  const list = TEXTS.filter((text) => text.level === level)
  return list.reduce((sum, text) => sum + wordCount(text), 0) / list.length
}

describe('biblioteca de textos', () => {
  it('no se pierde nada al validar y la cifra del inicio es la de los datos', () => {
    expect(TEXTS).toHaveLength(raw.texts.length)
    expect(TEXTS).toHaveLength(TEXT_COUNT)
  })

  it('tiene seis textos por nivel, de más corto a más largo según el nivel', () => {
    const counts = COURSE_LEVELS.map((level) => TEXTS.filter((text) => text.level === level.id).length)
    expect(counts).toEqual(COURSE_LEVELS.map(() => 6))
    const averages = COURSE_LEVELS.map((level) => averageWords(level.id))
    expect(averages).toEqual(averages.toSorted((a, b) => a - b))
  })

  it('cada frase está bien puntuada y traducida, sin repetirse', () => {
    const problems = TEXTS.flatMap((text) =>
      sentencesOf(text).flatMap((sentence) => {
        const out: string[] = []
        if (!/^[A-Z"“'0-9]/.test(sentence.en) || !/[.?!]["”']?$/.test(sentence.en))
          out.push(`${text.id}: ${sentence.en}`)
        if (!/^[A-ZÁÉÍÓÚÑ¿¡«"0-9]/.test(sentence.es) || !/[.?!»"]$/.test(sentence.es))
          out.push(`${text.id}: ${sentence.es}`)
        if (sentence.en === sentence.es) out.push(`${text.id}: sin traducir`)
        return out
      }),
    )
    expect(problems).toEqual([])
    const all = TEXTS.flatMap((text) => sentencesOf(text).map((sentence) => sentence.en))
    expect(new Set(all).size).toBe(all.length)
  })

  it('descarta lo dañado sin arrastrar al resto y calcula la duración', () => {
    const parsed = parseTexts({
      texts: [
        {
          id: 'ok',
          level: 'a1',
          title: 'T',
          titleEs: 'T',
          topic: 'X',
          paragraphs: [[{ en: 'Hi there.', es: 'Hola.' }]],
        },
        { id: 'ok', level: 'a1', title: 'Repetido', titleEs: 'R', topic: 'X', paragraphs: [[{ en: 'A.', es: 'B.' }]] },
        { id: 'Mal Id', level: 'a1', title: 'T', titleEs: 'T', topic: 'X', paragraphs: [[{ en: 'A.', es: 'B.' }]] },
        { id: 'vacio', level: 'a1', title: 'T', titleEs: 'T', topic: 'X', paragraphs: [[{ en: '', es: 'B.' }]] },
        { id: 'nivel', level: 'z9', title: 'T', titleEs: 'T', topic: 'X', paragraphs: [[{ en: 'A.', es: 'B.' }]] },
      ],
    })
    expect(parsed.map((text) => text.id)).toEqual(['ok'])
    expect(parseTexts(null)).toEqual([])
    expect(listeningMinutes(parsed[0])).toBe(1)
  })
})
