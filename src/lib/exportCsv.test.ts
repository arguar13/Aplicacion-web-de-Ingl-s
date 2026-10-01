import { describe, expect, it } from 'vitest'
import { csvField, exportWordsCsv, toCsv } from './exportCsv'
import { EMPTY_PROGRESS } from './progress'
import { fromLeitner } from './scheduler'
import type { Word } from './types'

const water: Word = { id: 'water', en: 'water', es: 'agua', pos: 'noun' }
const to: Word = { id: 'to', en: 'to', es: 'a, para', pos: 'prep' }

describe('exportar a CSV', () => {
  it('protege con comillas lo que lleva comas, comillas o saltos de línea', () => {
    expect(csvField('agua')).toBe('agua')
    expect(csvField('a, para')).toBe('"a, para"')
    expect(csvField('She said "hi"')).toBe('"She said ""hi"""')
    expect(
      toCsv([
        ['a', 'b'],
        ['1', '2'],
      ]),
    ).toBe('\uFEFFa,b\r\n1,2\r\n')
  })

  it('exporta cabecera, detalles, estado y favoritas, listo para Anki o una hoja de cálculo', () => {
    const details = new Map([
      ['water', { ipa: '/ˈwɔtər/', example: { en: 'Drink more water.', es: 'Toma más agua.' } }],
    ])
    const progress = { ...EMPTY_PROGRESS, cards: { 'en-es:water': fromLeitner(5, 0, 5, 0) }, favorites: ['to'] }
    const csv = exportWordsCsv([water, to], details, progress, 'en-es')
    const lines = csv.replace('\uFEFF', '').trimEnd().split('\r\n')
    expect(lines[0]).toBe('ingles,espanol,categoria,ipa,ejemplo,ejemplo_es,estado,favorita')
    expect(lines[1]).toBe('water,agua,sustantivo,/ˈwɔtər/,Drink more water.,Toma más agua.,dominada,')
    expect(lines[2]).toBe('to,"a, para",preposición,,,,nueva,si')
  })

  it('sin detalles cargados, exporta igual con las columnas vacías', () => {
    expect(exportWordsCsv([water], null, EMPTY_PROGRESS, 'en-es')).toContain('water,agua,sustantivo,,,,nueva,')
  })
})
