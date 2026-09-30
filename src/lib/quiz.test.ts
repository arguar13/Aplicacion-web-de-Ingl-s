import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildOptions, resemblance, normalize, senses } from './quiz'
import { ALL_WORDS, LEVELS } from './decks'
import { PARTS_OF_SPEECH, type Word } from './types'

const WORDS = ALL_WORDS

describe('normalize', () => {
  it('ignora mayúsculas, tildes y espacios', () => {
    expect(normalize('  Ácido ')).toBe('acido')
    expect(normalize('Señor')).toBe('senor')
  })
})

describe('buildOptions', () => {
  it('incluye la respuesta y traducciones distintas entre sí', () => {
    for (let i = 0; i < 500; i++) {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)]
      const options = buildOptions(word, WORDS)
      expect(options).toHaveLength(4)
      expect(options).toContain(word)
      const all = options.flatMap((o) => senses(o.es))
      expect(new Set(all).size).toBe(all.length)
    }
  })

  it('en los datos, cada traducción tiene sentidos y ninguno repetido', () => {
    const repeated = WORDS.filter((word) => {
      const keys = senses(word.es)
      return keys.length === 0 || new Set(keys).size !== keys.length
    })
    expect(repeated.map((word) => `${word.id}: ${word.es}`)).toEqual([])
  })

  it('con una palabra afianzada, los distractores se le parecen más', () => {
    const word = WORDS.find((w) => w.id === 'affect') ?? WORDS.find((w) => w.pos === 'verb')!
    const pool = WORDS.slice(0, 3000)
    const average = (confusable: boolean) => {
      let total = 0
      for (let i = 0; i < 40; i++) {
        const options = buildOptions(word, pool, undefined, undefined, { confusable })
        total += options.filter((o) => o !== word).reduce((sum, o) => sum + resemblance(word.en, o.en), 0)
      }
      return total / 40
    }
    expect(average(true)).toBeGreaterThan(average(false) + 3)
  })

  it('el parecido premia comienzo y final compartidos', () => {
    expect(resemblance('affect', 'effect')).toBeGreaterThan(resemblance('affect', 'water'))
    expect(resemblance('contract', 'contact')).toBeGreaterThan(resemblance('contract', 'table'))
    expect(resemblance('same', 'same')).toBe(0)
  })

  it('separa los sentidos ignorando paréntesis', () => {
    expect(senses('a, para')).toEqual(['a', 'para'])
    expect(senses('fue (de ir)')).toEqual(['fue'])
    expect(senses('padre o madre')).toEqual(['padre', 'madre'])
  })

  it('no junta palabras que comparten un sentido', () => {
    const to = WORDS.find((w) => w.id === 'to')!
    const pool = WORDS.filter((w) => ['to', 'for', 'water', 'tree', 'zoo'].includes(w.id))
    for (let i = 0; i < 50; i++) {
      expect(buildOptions(to, pool).map((o) => o.id)).not.toContain('for')
    }
  })

  it('nunca usa como distractor otra palabra con la misma traducción', () => {
    const achieve = WORDS.find((w) => w.id === 'achieve')!
    const pool = WORDS.filter((w) => w.es === 'lograr' || w.id === 'water' || w.id === 'tree' || w.id === 'zoo')
    const options = buildOptions(achieve, pool)
    expect(options.filter((o) => o.es === 'lograr')).toEqual([achieve])
  })
})

const word = (id: string, pos: Word['pos']): Word => ({ id, en: id, es: `es-${id}`, pos })

describe('distractores por categoría gramatical', () => {
  it('elige distractores de la misma categoría cuando hay suficientes', () => {
    const pool = [
      ...['run', 'eat', 'sing', 'jump'].map((id) => word(id, 'verb')),
      ...['dog', 'cat', 'tree', 'car', 'house'].map((id) => word(id, 'noun')),
    ]
    for (let i = 0; i < 100; i++) {
      expect(buildOptions(pool[0], pool).every((o) => o.pos === 'verb')).toBe(true)
    }
  })

  it('si no alcanzan, completa con la familia más cercana y luego con cualquiera', () => {
    const pool = [
      word('quick', 'adj'),
      word('slowly', 'adv'),
      word('often', 'adv'),
      word('dog', 'noun'),
      word('cat', 'noun'),
    ]
    for (let i = 0; i < 100; i++) {
      const options = buildOptions(pool[0], pool)
      expect(options).toHaveLength(4)
      expect(options.filter((o) => o.pos === 'adv')).toHaveLength(2)
    }
  })

  it('con el vocabulario real, casi todos los distractores comparten categoría con la respuesta', () => {
    let same = 0
    let total = 0
    for (const deck of LEVELS) {
      for (let i = 0; i < 200; i++) {
        const answer = deck.words[Math.floor(Math.random() * deck.words.length)]
        for (const option of buildOptions(answer, deck.words)) {
          if (option.id === answer.id) continue
          total++
          if (option.pos === answer.pos) same++
        }
      }
    }
    expect(same / total).toBeGreaterThan(0.95)
  })
})

describe('datos', () => {
  it('cada palabra tiene una categoría gramatical conocida', () => {
    expect(WORDS.filter((w) => !PARTS_OF_SPEECH.includes(w.pos)).map((w) => w.id)).toEqual([])
  })

  it('cada palabra tiene id único y traducción', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length)
    expect(WORDS.every((w) => w.en && w.es && /^[a-z0-9-]+$/.test(w.id))).toBe(true)
  })

  it('cada palabra tiene su audio', () => {
    const audio = new Set(readdirSync(new URL('../../public/audio', import.meta.url)))
    expect(WORDS.filter((w) => !audio.has(`${w.id}.mp3`)).map((w) => w.id)).toEqual([])
  })
})
