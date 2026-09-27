/**
 * Repaso espaciado estilo Leitner, pensado para rondas rápidas.
 *
 * Cada palabra vive en una "caja". Acertar a la primera la sube de caja y la aleja en el tiempo;
 * fallar la devuelve a la caja 1. Dentro de la sesión, lo fallado vuelve a salir a las pocas rondas.
 */
import type { Rng, Word } from './types'
import { isFiniteNumber, isInteger, isRecord } from './validate'

export const MINUTE = 60_000
export const DAY = 24 * 60 * MINUTE

/** Espera hasta el siguiente repaso según la caja (el índice es la caja). */
export const INTERVALS = [0, 10 * MINUTE, DAY, 3 * DAY, 7 * DAY, 21 * DAY, 60 * DAY] as const
export const MAX_BOX = INTERVALS.length - 1
/** Desde esta caja la palabra se considera dominada (acertada en varios días distintos). */
export const MASTERED_BOX = 4
/** Rondas que esperan las palabras falladas antes de volver a salir en la misma sesión. */
export const REQUEUE_AFTER = 4
const RECENT_WINDOW = 3

export interface CardState {
  box: number
  /** Momento (ms) a partir del cual toca repasarla. */
  due: number
  seen: number
  lapses: number
}

/** Valida una tarjeta leída del almacenamiento; `null` si no es utilizable. */
export function parseCard(raw: unknown): CardState | null {
  if (!isRecord(raw)) return null
  const { box, due, seen, lapses } = raw
  if (!isInteger(box, 1, MAX_BOX) || !isFiniteNumber(due) || !isInteger(seen, 0) || !isInteger(lapses, 0)) return null
  return { box, due, seen, lapses }
}

export type CardStatus = 'new' | 'learning' | 'mastered'

export function statusOf(card: CardState | undefined): CardStatus {
  if (!card) return 'new'
  return card.box >= MASTERED_BOX ? 'mastered' : 'learning'
}

/** Nuevo estado de una palabra tras responderla. `clean` = acertada sin fallar ninguna tecla. */
export function review(card: CardState | undefined, clean: boolean, now: number): CardState {
  const seen = (card?.seen ?? 0) + 1
  const lapses = card?.lapses ?? 0
  if (!clean) return { box: 1, due: now + INTERVALS[1], seen, lapses: lapses + 1 }
  // Una palabra nueva acertada a la primera probablemente ya se conoce: salta directo a un día.
  const box = card ? Math.min(card.box + 1, MAX_BOX) : 2
  return { box, due: now + INTERVALS[box], seen, lapses }
}

export interface Session {
  /** Rondas completadas en esta sesión. */
  step: number
  /** Palabras falladas → ronda a partir de la cual deben volver a salir. */
  requeue: Map<string, number>
  /** Últimas palabras mostradas, para no repetirlas seguidas. */
  recent: string[]
}

export function createSession(): Session {
  return { step: 0, requeue: new Map(), recent: [] }
}

/** Registra en la sesión el resultado de una ronda. */
export function advanceSession(session: Session, id: string, clean: boolean): void {
  session.step++
  if (clean) session.requeue.delete(id)
  else session.requeue.set(id, session.step + REQUEUE_AFTER)
  session.recent = [id, ...session.recent.filter((r) => r !== id)].slice(0, RECENT_WINDOW)
}

export type PickReason = 'relearn' | 'review' | 'new' | 'practice'

export interface Pick {
  word: Word
  reason: PickReason
}

export interface PickOptions {
  /** Cómo se introducen las palabras nuevas: por frecuencia (niveles) o al azar (todas). */
  newOrder: 'frequency' | 'random'
}

type CardLookup = (id: string) => CardState | undefined

/**
 * Decide la siguiente palabra. Prioridad: falladas en la sesión que ya toca repetir, repasos
 * vencidos, palabras nuevas y, si no queda nada, práctica libre favoreciendo las más débiles.
 */
export function pickNext(
  words: readonly Word[],
  getCard: CardLookup,
  session: Session,
  now: number,
  options: PickOptions,
  rng: Rng = Math.random,
): Pick {
  if (words.length === 0) throw new Error('El mazo está vacío')
  const recent = new Set(words.length > RECENT_WINDOW ? session.recent : [])
  const available = (w: Word) => !recent.has(w.id)
  const pickAmong = <T>(items: T[]) => items[Math.floor(rng() * items.length)]

  let relearn: Word | undefined
  let relearnStep = Infinity
  for (const [id, step] of session.requeue) {
    if (step > session.step || step >= relearnStep) continue
    const word = words.find((w) => w.id === id)
    if (word && available(word)) {
      relearn = word
      relearnStep = step
    }
  }
  if (relearn) return { word: relearn, reason: 'relearn' }

  const due: Array<{ word: Word; due: number }> = []
  const fresh: Word[] = []
  for (const word of words) {
    if (!available(word) || session.requeue.has(word.id)) continue
    const card = getCard(word.id)
    if (!card) fresh.push(word)
    else if (card.due <= now) due.push({ word, due: card.due })
  }

  if (due.length > 0) {
    due.sort((a, b) => a.due - b.due)
    return { word: pickAmong(due.slice(0, 3)).word, reason: 'review' }
  }

  if (fresh.length > 0) {
    // Por frecuencia, pero con algo de variedad entre las siguientes.
    const pool = options.newOrder === 'frequency' ? fresh.slice(0, 3) : fresh
    return { word: pickAmong(pool), reason: 'new' }
  }

  // Todo visto y nada pendiente: torneo entre unas cuantas al azar, gana la de caja más baja.
  const candidates = words.filter(available)
  const pool = candidates.length > 0 ? candidates : [...words]
  let best = pickAmong(pool)
  for (let i = 0; i < 4; i++) {
    const other = pickAmong(pool)
    if ((getCard(other.id)?.box ?? 0) < (getCard(best.id)?.box ?? 0)) best = other
  }
  return { word: best, reason: 'practice' }
}

export interface DeckSummary {
  total: number
  fresh: number
  learning: number
  mastered: number
  /** Palabras ya vistas cuyo repaso está vencido. */
  due: number
}

export function summarize(words: readonly Word[], getCard: CardLookup, now: number): DeckSummary {
  const summary: DeckSummary = { total: words.length, fresh: 0, learning: 0, mastered: 0, due: 0 }
  for (const word of words) {
    const card = getCard(word.id)
    const status = statusOf(card)
    if (status === 'new') summary.fresh++
    else if (status === 'learning') summary.learning++
    else summary.mastered++
    if (card && card.due <= now) summary.due++
  }
  return summary
}
