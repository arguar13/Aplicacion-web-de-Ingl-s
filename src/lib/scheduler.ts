/**
 * Repaso espaciado con FSRS (Free Spaced Repetition Scheduler), pensado para rondas rápidas.
 *
 * Cada palabra tiene una estabilidad (días que tarda en bajar al 90 % la probabilidad de
 * recordarla) y una dificultad propias, que se ajustan con cada respuesta. El repaso se programa
 * para cuando la probabilidad de recordarla cae al 90 %: lo fácil se aleja rápido, lo difícil vuelve
 * pronto. Dentro de la sesión, lo fallado vuelve a salir a las pocas rondas.
 */
import { type Card, createEmptyCard, fsrs, generatorParameters, type Grade, Rating, State } from 'ts-fsrs'
import type { Rng, Word } from './types'
import { isFiniteNumber, isInteger, isRecord } from './validate'

export const MINUTE = 60_000
export const DAY = 24 * 60 * MINUTE

/** Desde esta estabilidad (días) la palabra se considera dominada. */
export const MASTERED_STABILITY = 7
/** Rondas que esperan las palabras falladas antes de volver a salir en la misma sesión. */
export const REQUEUE_AFTER = 4
const RECENT_WINDOW = 3
/** Respuesta rápida o lenta, para afinar la nota que recibe FSRS. */
export const FAST_ANSWER_MS = 2500
export const SLOW_ANSWER_MS = 8000

/** Retención objetivo por defecto: FSRS programa el repaso cuando la probabilidad de recordar baja a esto. */
export const DEFAULT_RETENTION = 0.9

// Sin "fuzz": el mismo historial da siempre el mismo calendario (y los tests son deterministas).
// Un planificador por retención objetivo (relajado, normal, intensivo), creado al usarse.
const schedulers = new Map<number, ReturnType<typeof fsrs>>()
function schedulerFor(retention: number) {
  let scheduler = schedulers.get(retention)
  if (!scheduler) {
    scheduler = fsrs(generatorParameters({ enable_fuzz: false, request_retention: retention }))
    schedulers.set(retention, scheduler)
  }
  return scheduler
}

export type CardPhase = 'learning' | 'review' | 'relearning'

/** Estado guardado de una palabra: lo que FSRS necesita, en formato compacto. */
export interface CardState {
  /** Momento (ms) a partir del cual toca repasarla. */
  due: number
  stability: number
  difficulty: number
  phase: CardPhase
  /** Paso de aprendizaje en curso (fase learning/relearning). */
  step: number
  /** Veces respondida. */
  reps: number
  /** Veces olvidada tras haberla aprendido. */
  lapses: number
  /** Último repaso (ms). */
  last: number
}

const PHASES: Record<CardPhase, State> = {
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

function toFsrs(card: CardState): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0,
    scheduled_days: Math.max(0, Math.round((card.due - card.last) / DAY)),
    learning_steps: card.step,
    reps: card.reps,
    lapses: card.lapses,
    state: PHASES[card.phase],
    last_review: new Date(card.last),
  }
}

function fromFsrs(card: Card): CardState {
  const phase = card.state === State.Review ? 'review' : card.state === State.Relearning ? 'relearning' : 'learning'
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    phase,
    step: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    last: card.last_review?.getTime() ?? card.due.getTime(),
  }
}

/** Nota que uno mismo se pone en el modo tarjetas: las cuatro de FSRS, con su nombre. */
export type SelfRating = 'again' | 'hard' | 'good' | 'easy'
export const SELF_RATINGS: readonly SelfRating[] = ['again', 'hard', 'good', 'easy']

const SELF_GRADE: Record<SelfRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

/** Nota de la respuesta para FSRS según si hubo fallos y lo que tardó. */
export function gradeAnswer({
  clean,
  ms,
  isNew,
  almost = false,
  trusted = false,
  rating,
}: {
  clean: boolean
  ms: number
  isNew: boolean
  /** Escrita con un error de tecleo: se sabe, pero no del todo. */
  almost?: boolean
  /**
   * Quien viene acertando casi todas las nuevas, y rápido: un acierto instantáneo en una palabra
   * nueva es que ya la sabía (no suerte), así que se aleja como fácil. Lo decide el entrenador.
   */
  trusted?: boolean
  /** Modo tarjetas: la nota la pone el propio estudiante y manda sobre todo lo demás. */
  rating?: SelfRating
}): Grade {
  if (rating) return SELF_GRADE[rating]
  if (!clean) return Rating.Again
  if (almost || ms >= SLOW_ANSWER_MS) return Rating.Hard
  // Una palabra nueva acertada podría ser suerte (1 de 4): pasa por un paso de aprendizaje, salvo
  // que el entrenador confíe en que ya se sabía.
  if ((!isNew || trusted) && ms <= FAST_ANSWER_MS) return Rating.Easy
  return Rating.Good
}

/** Nuevo estado de una palabra tras responderla. */
export function review(
  card: CardState | undefined,
  grade: Grade,
  now: number,
  retention = DEFAULT_RETENTION,
): CardState {
  const current = card ? toFsrs(card) : createEmptyCard(new Date(now))
  return fromFsrs(schedulerFor(retention).next(current, new Date(now), grade).card)
}

/**
 * Cuánto se alejaría la palabra con cada nota (ms desde `now`), para mostrarlo en las tarjetas antes
 * de calificarse, como hacen las apps de repaso espaciado.
 */
export function previewIntervals(
  card: CardState | undefined,
  now: number,
  retention = DEFAULT_RETENTION,
): Record<SelfRating, number> {
  const interval = (rating: SelfRating) => Math.max(0, review(card, SELF_GRADE[rating], now, retention).due - now)
  return { again: interval('again'), hard: interval('hard'), good: interval('good'), easy: interval('easy') }
}

// --- Migración desde Leitner (progreso v1) --------------------------------------------------------

/** Intervalo de cada caja Leitner de la versión 1, en ms (el índice es la caja). */
const LEITNER_INTERVALS = [0, 10 * MINUTE, DAY, 3 * DAY, 7 * DAY, 21 * DAY, 60 * DAY]

/**
 * Convierte una tarjeta Leitner en una FSRS equivalente: la estabilidad es el intervalo de su caja
 * (FSRS programa el repaso cuando la retención baja al 90 %, justo a una estabilidad de distancia),
 * la fecha de repaso no cambia y la dificultad sube con los olvidos. Así "dominadas" (caja 4 o más
 * = estabilidad de 7 días o más) sigue contando lo mismo tras migrar.
 */
export function fromLeitner(box: number, due: number, seen: number, lapses: number): CardState {
  const interval = LEITNER_INTERVALS[Math.min(Math.max(box, 1), LEITNER_INTERVALS.length - 1)]
  const learning = box <= 1
  return {
    due,
    stability: learning ? 0.5 : interval / DAY,
    difficulty: Math.min(10, 5 + lapses * 0.75),
    phase: learning ? (lapses > 0 ? 'relearning' : 'learning') : 'review',
    step: 0,
    reps: seen,
    lapses,
    last: due - interval,
  }
}

/** Valida una tarjeta leída del almacenamiento; `null` si no es utilizable. */
export function parseCard(raw: unknown): CardState | null {
  if (!isRecord(raw)) return null
  const { due, stability, difficulty, phase, step, reps, lapses, last } = raw
  if (!isFiniteNumber(due) || !isFiniteNumber(last)) return null
  if (!isFiniteNumber(stability) || stability <= 0 || !isFiniteNumber(difficulty)) return null
  if (phase !== 'learning' && phase !== 'review' && phase !== 'relearning') return null
  if (!isInteger(step, 0) || !isInteger(reps, 0) || !isInteger(lapses, 0)) return null
  return { due, stability, difficulty: Math.min(10, Math.max(1, difficulty)), phase, step, reps, lapses, last }
}

export type CardStatus = 'new' | 'learning' | 'mastered'

export const isMastered = (card: CardState) => card.phase === 'review' && card.stability >= MASTERED_STABILITY

export function statusOf(card: CardState | undefined): CardStatus {
  if (!card) return 'new'
  return isMastered(card) ? 'mastered' : 'learning'
}

// --- Sesión y elección de la siguiente palabra -----------------------------------------------------

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

/** Por qué sale una palabra. `skill`: sube de escalón en la sesión inteligente (ver coach.ts). */
export type PickReason = 'relearn' | 'review' | 'new' | 'practice' | 'skill'

export interface Pick {
  word: Word
  reason: PickReason
}

export interface PickOptions {
  /** Cómo se introducen las palabras nuevas: por frecuencia (niveles) o al azar (todas). */
  newOrder: 'frequency' | 'random'
  /** false cuando ya se alcanzó el límite de palabras nuevas del día. */
  allowNew?: boolean
}

export type CardLookup = (id: string) => CardState | undefined

/**
 * Decide la siguiente palabra. Prioridad: falladas en la sesión que ya toca repetir, repasos
 * vencidos, palabras nuevas (si quedan del límite diario) y, si no queda nada, práctica libre
 * favoreciendo las más frágiles (menor estabilidad).
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
  const seen: Word[] = []
  for (const word of words) {
    if (!available(word) || session.requeue.has(word.id)) continue
    const card = getCard(word.id)
    if (!card) fresh.push(word)
    else {
      seen.push(word)
      if (card.due <= now) due.push({ word, due: card.due })
    }
  }

  if (due.length > 0) {
    due.sort((a, b) => a.due - b.due)
    return { word: pickAmong(due.slice(0, 3)).word, reason: 'review' }
  }

  if (fresh.length > 0 && (options.allowNew ?? true)) {
    // Por frecuencia, pero con algo de variedad entre las siguientes.
    const pool = options.newOrder === 'frequency' ? fresh.slice(0, 3) : fresh
    return { word: pickAmong(pool), reason: 'new' }
  }

  // Nada pendiente: torneo entre unas cuantas ya vistas, gana la más frágil. Si no hay ninguna
  // vista (límite de nuevas alcanzado en un mazo sin empezar), se practica con las nuevas.
  const candidates = seen.length > 0 ? seen : fresh.length > 0 ? fresh : words.filter(available)
  const pool = candidates.length > 0 ? candidates : [...words]
  const strength = (w: Word) => getCard(w.id)?.stability ?? 0
  let best = pickAmong(pool)
  for (let i = 0; i < 4; i++) {
    const other = pickAmong(pool)
    if (strength(other) < strength(best)) best = other
  }
  return { word: best, reason: getCard(best.id) ? 'practice' : 'new' }
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
