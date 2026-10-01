/**
 * Exportar palabras a CSV: para abrirlas en una hoja de cálculo o importarlas en Anki (que lee CSV
 * con cabecera: inglés y español en las dos primeras columnas, el resto como campos extra).
 */
import { type DetailsMap } from './details'
import { POS_LABEL } from './details'
import { cardKey, type ProgressData } from './progress'
import { statusOf } from './scheduler'
import { isHard } from './smartDecks'
import type { Track, Word } from './types'

const HEADER = ['ingles', 'espanol', 'categoria', 'ipa', 'ejemplo', 'ejemplo_es', 'estado', 'favorita']

const STATUS_LABEL = { new: 'nueva', learning: 'aprendiendo', mastered: 'dominada', hard: 'dificil' } as const

/** Un campo CSV: entre comillas si lleva coma, comillas o saltos de línea (RFC 4180). */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  // BOM al principio: así Excel abre el archivo en UTF-8 y las tildes se ven bien.
  return `\uFEFF${rows.map((row) => row.map(csvField).join(',')).join('\r\n')}\r\n`
}

export function exportWordsCsv(
  words: readonly Word[],
  details: DetailsMap | null,
  progress: ProgressData,
  track: Track,
): string {
  const favorites = new Set(progress.favorites)
  const rows = words.map((word) => {
    const entry = details?.get(word.id)
    const card = progress.cards[cardKey(track, word.id)]
    const status = card && isHard(card) ? 'hard' : statusOf(card)
    return [
      word.en,
      word.es,
      POS_LABEL[word.pos],
      entry?.ipa ?? '',
      entry?.example?.en ?? '',
      entry?.example?.es ?? '',
      STATUS_LABEL[status],
      favorites.has(word.id) ? 'si' : '',
    ]
  })
  return toCsv([HEADER, ...rows])
}

export const csvFileName = (day: string) => `tecla-vocabulario-${day}.csv`
