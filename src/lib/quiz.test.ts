import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import words from '@/data/words.json'
import { buildOptions, createRound, normalize, pickWord } from './quiz'
import type { Word } from './types'

const WORDS = words as Word[]

describe('normalize', () => {
  it('ignora mayúsculas, tildes y espacios', () => {
    expect(normalize('  Ácido ')).toBe('acido')
    expect(normalize('Señor')).toBe('senor')
  })
})

describe('buildOptions', () => {
  it('incluye la respuesta y traducciones distintas entre sí', () => {
    for (let i = 0; i < 500; i++) {
      const { word, options } = createRound(WORDS)
      expect(options).toHaveLength(4)
      expect(options).toContain(word)
      expect(new Set(options.map((o) => normalize(o.es))).size).toBe(4)
    }
  })

  it('nunca usa como distractor otra palabra con la misma traducción', () => {
    const achieve = WORDS.find((w) => w.id === 'achieve')!
    const pool = WORDS.filter((w) => w.es === 'lograr' || w.id === 'water' || w.id === 'tree' || w.id === 'zoo')
    const options = buildOptions(achieve, pool)
    expect(options.filter((o) => o.es === 'lograr')).toEqual([achieve])
  })
})

describe('pickWord', () => {
  it('evita las palabras indicadas', () => {
    const pool = WORDS.slice(0, 2)
    for (let i = 0; i < 50; i++) {
      expect(pickWord(pool, new Set([pool[0].id])).id).toBe(pool[1].id)
    }
  })
})

describe('datos', () => {
  it('cada palabra tiene id único y traducción', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length)
    expect(WORDS.every((w) => w.en && w.es && /^[a-z0-9-]+$/.test(w.id))).toBe(true)
  })

  it('cada palabra tiene su audio', () => {
    const audio = new Set(readdirSync(new URL('../../public/audio', import.meta.url)))
    expect(WORDS.filter((w) => !audio.has(`${w.id}.mp3`)).map((w) => w.id)).toEqual([])
  })
})
