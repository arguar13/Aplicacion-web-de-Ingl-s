/**
 * Entrenador de la sesión inteligente: decide qué practicar en cada ronda, sin elegir niveles.
 *
 * - **Lo fallado vuelve** a las pocas rondas en la misma sesión, y luego según FSRS.
 * - **Repasos a tiempo:** lo que vence, empezando por lo que más riesgo tiene de olvidarse. Con una
 *   pila de repasos, cada pocos entra algo nuevo (ver REVIEWS_BETWEEN_NEW): la sesión siempre avanza.
 * - **Escalera de habilidades:** cada palabra se aprende primero reconociéndola (inglés → español),
 *   luego recordándola (español → inglés), después de oído y por último escribiéndola. Sube de
 *   escalón cuando el anterior está afianzado.
 * - **Palabras nuevas en orden, una tras otra:** la lista va de la más usada a la menos usada y el
 *   recorrido es secuencial desde el nivel de partida. El ritmo se adapta: entran mientras las que se
 *   están aprendiendo sean pocas para ese ritmo. Quien acierta casi todo y rápido "acelera" (más
 *   palabras a la vez, y lo que ya sabía se aleja como fácil); con errores se "afianza".
 * - **Sin bucles de lo ya sabido:** si no cabe nada nuevo, se adelantan las palabras que se están
 *   aprendiendo (lo que de verdad necesita repetición); solo si no hay ninguna se practica lo más
 *   frágil, y lo dominado únicamente si no queda otra cosa.
 *
 * Todo sale del progreso y del historial guardados: no hay estado propio que pueda desincronizarse.
 */
import { ALL_WORDS } from './decks'
import type { StudyEvent } from './events'
import { cardKey, type ProgressData } from './progress'
import {
  type CardState,
  FAST_ANSWER_MS,
  isMastered,
  MINUTE,
  newSlotOpen,
  type PickReason,
  type Session,
} from './scheduler'
import type { Mode, Rng, Track, Word } from './types'

/** Escalones de la escalera de habilidades, en orden. */
export const LADDER: readonly Track[] = ['en-es', 'es-en', 'listen', 'type']
/** Estabilidad (días) a partir de la cual un escalón está afianzado y la palabra sube al siguiente. */
export const RUNG_STABILITY = 4

/**
 * Un escalón está afianzado cuando ya superó un repaso espaciado con esa estabilidad. Un acierto
 * instantáneo en una palabra nueva da mucha estabilidad de golpe, pero aún no demuestra memoria:
 * subirla de escalón en el acto llenaría la sesión de palabras recién vistas en otra habilidad.
 */
export const rungSettled = (card: CardState | undefined) =>
  card !== undefined && card.phase === 'review' && card.reps >= 2 && card.stability >= RUNG_STABILITY

export type Pace = 'steady' | 'normal' | 'fast'

/** Palabras en aprendizaje a la vez (aún en pasos cortos) según el ritmo. */
export const WORKING_SET: Record<Pace, number> = { steady: 6, normal: 10, fast: 15 }
/** Con repasos pendientes, cuántos seguidos como mucho antes de introducir algo nuevo. */
export const REVIEWS_BETWEEN_NEW: Record<Pace, number> = { steady: 5, normal: 3, fast: 2 }
/**
 * Cuánto se puede adelantar una palabra en aprendizaje cuando no cabe nada nuevo. Sus pasos son de
 * minutos: adelantarla un poco la afianza antes, y es mucho mejor que repetir lo ya dominado.
 */
export const LEARN_AHEAD_MS = 20 * MINUTE
/** Respuestas recientes que se miran para decidir el ritmo. */
const RECENT_FIRSTS = 20
const RECENT_REVIEWS = 60
/** Con menos primeros encuentros que esto aún no se sabe cómo va: ritmo normal. */
const MIN_SAMPLES = 8

export interface Learner {
  pace: Pace
  /** Nuevas acertadas a la primera, de las últimas vistas (0–1); null sin datos. */
  newAccuracy: number | null
  /** De esas, las acertadas en menos de FAST_ANSWER_MS. */
  fastShare: number | null
  /** Repasos acertados a la primera, de los últimos. */
  retention: number | null
}

const ratio = (hits: number, total: number) => (total > 0 ? hits / total : null)

/** Cómo va el estudiante, a partir del historial de respuestas. */
export function assessLearner(events: readonly StudyEvent[]): Learner {
  const firsts = events.filter((event) => event.f).slice(-RECENT_FIRSTS)
  const reviews = events.filter((event) => !event.f).slice(-RECENT_REVIEWS)
  const newAccuracy = ratio(firsts.filter((event) => event.r === 'clean').length, firsts.length)
  const fastShare = ratio(
    firsts.filter((event) => event.r === 'clean' && event.ms <= FAST_ANSWER_MS).length,
    firsts.length,
  )
  const retention = ratio(reviews.filter((event) => event.r === 'clean').length, reviews.length)

  let pace: Pace = 'normal'
  if (firsts.length >= MIN_SAMPLES && newAccuracy !== null && fastShare !== null) {
    const recallOk = retention === null || retention >= 0.85
    if (newAccuracy >= 0.85 && fastShare >= 0.5 && recallOk) pace = 'fast'
    else if (newAccuracy < 0.65 || (retention !== null && retention < 0.75)) pace = 'steady'
  }
  return { pace, newAccuracy, fastShare, retention }
}

export interface CoachPick {
  word: Word
  track: Track
  reason: PickReason
}

export const modeOf = (track: Track): Mode => track

export interface CoachOptions {
  /** false cuando ya se alcanzó el límite diario de palabras nuevas. */
  allowNew: boolean
  /**
   * Posición en la lista desde la que se introducen las nuevas (el nivel que recomendó la prueba).
   * Si ya no quedan nuevas desde ahí, se sigue con las anteriores que falten.
   */
  startRank?: number
}

interface Candidate {
  word: Word
  track: Track
  card: CardState
}

const byId = new Map(ALL_WORDS.map((word) => [word.id, word]))

/** Palabra y habilidad de una clave de sesión o de progreso ("en-es:water"). */
const keyOf = (track: Track, word: Word) => cardKey(track, word.id)

/** Riesgo de olvido: tiempo desde el último repaso respecto de su estabilidad (más alto, más riesgo). */
const riskAt = (now: number) => (c: Candidate) => (now - c.card.last) / c.card.stability

/** Los `k` elementos de mayor puntuación, sin ordenar toda la lista (puede tener decenas de miles). */
export function topBy<T>(items: readonly T[], score: (item: T) => number, k: number): T[] {
  const top: Array<{ item: T; value: number }> = []
  for (const item of items) {
    const value = score(item)
    if (top.length === k && value <= top[k - 1].value) continue
    let i = top.length < k ? top.length : k - 1
    top[i] = { item, value }
    while (i > 0 && top[i - 1].value < top[i].value) {
      const swap = top[i - 1]
      top[i - 1] = top[i]
      top[i] = swap
      i--
    }
  }
  return top.map((entry) => entry.item)
}

/**
 * Siguiente ronda de la sesión inteligente. La sesión guarda sus claves como `habilidad:palabra`
 * (una misma palabra puede estar fallada en una habilidad y bien en otra).
 */
export function pickCoach(
  progress: ProgressData,
  session: Session,
  now: number,
  learner: Learner,
  { allowNew, startRank = 0 }: CoachOptions,
  rng: Rng = Math.random,
): CoachPick {
  const words = ALL_WORDS
  const cards = progress.cards
  const last = session.recent[0]
  const lastWord = last?.slice(last.indexOf(':') + 1)
  // Ni la misma palabra dos veces seguidas (aunque sea en otra habilidad) ni lo recién visto.
  const available = (track: Track, word: Word) => word.id !== lastWord && !session.recent.includes(keyOf(track, word))
  const pickAmong = <T>(items: readonly T[]) => items[Math.floor(rng() * items.length)]

  // 1. Lo fallado en la sesión que ya toca repetir.
  let relearn: CoachPick | null = null
  let relearnStep = Infinity
  for (const [key, step] of session.requeue) {
    if (step > session.step || step >= relearnStep) continue
    const split = key.indexOf(':')
    const track = LADDER.find((t) => t === key.slice(0, split))
    const word = track ? byId.get(key.slice(split + 1)) : undefined
    if (track && word && available(track, word)) {
      relearn = { word, track, reason: 'relearn' }
      relearnStep = step
    }
  }
  if (relearn) return relearn

  // 2. Un solo recorrido del vocabulario (en orden de frecuencia) para todo lo demás.
  const due: Candidate[] = []
  const learning: Candidate[] = []
  const learned: Candidate[] = []
  let working = 0
  let skill: CoachPick | null = null
  let gap: Word | null = null
  let earlierGap: Word | null = null
  for (const [rank, word] of words.entries()) {
    let firstMissing = -1
    for (const [rung, track] of LADDER.entries()) {
      // Se miran todas las habilidades: quien practicó "escuchar" desde un nivel tiene esa tarjeta
      // aunque le falte la de recordar, y sus repasos también cuentan.
      const card = cards[keyOf(track, word)]
      if (!card) {
        if (firstMissing === -1) firstMissing = rung
        continue
      }
      if (card.phase !== 'review') working++
      if (session.requeue.has(keyOf(track, word)) || !available(track, word)) continue
      const candidate = { word, track, card }
      if (card.due <= now) due.push(candidate)
      else if (card.phase !== 'review') learning.push(candidate)
      else learned.push(candidate)
    }
    // Sin el primer escalón, la palabra es nueva: gana la primera que aparece (la más frecuente), así
    // el recorrido es secuencial. Si falta otro escalón, se sube cuando el anterior está afianzado.
    if (firstMissing === 0 && available('en-es', word)) {
      if (rank >= startRank) gap ??= word
      else earlierGap ??= word
    }
    if (firstMissing > 0 && !skill) {
      const track = LADDER[firstMissing]
      if (rungSettled(cards[keyOf(LADDER[firstMissing - 1], word)]) && available(track, word)) {
        skill = { word, track, reason: 'skill' }
      }
    }
  }
  const next = allowNew ? (gap ?? earlierGap) : null

  // 3. Algo nuevo (subir de escalón o una palabra) si cabe en el ritmo. Con repasos pendientes, solo
  // cada pocos repasos: ni la pila de repasos tapa lo nuevo ni lo nuevo deja repasos sin hacer.
  const roomForNew = working < WORKING_SET[learner.pace]
  if (roomForNew && (skill || next) && newSlotOpen(session, due.length > 0, REVIEWS_BETWEEN_NEW[learner.pace])) {
    // Subir de escalón no gasta el cupo de nuevas; con los dos disponibles, se alternan.
    if (skill && (!next || rng() < 0.4)) return skill
    if (next) return { word: next, track: 'en-es', reason: 'new' }
  }

  // 4. Repasos vencidos: los de más riesgo de olvido primero, con algo de variedad entre los tres más urgentes.
  if (due.length > 0) {
    const pick = pickAmong(topBy(due, riskAt(now), 3))
    return { word: pick.word, track: pick.track, reason: 'review' }
  }

  // 5. No cabe nada nuevo: se adelanta lo que se está aprendiendo y vence pronto. Es lo que necesita
  // repetición; repetir lo ya dominado no enseña nada.
  const soon = learning.filter((c) => c.card.due - now <= LEARN_AHEAD_MS)
  if (soon.length > 0) {
    const pick = pickAmong(topBy(soon, (c) => -c.card.due, 2))
    return { word: pick.word, track: pick.track, reason: 'learning' }
  }

  // 6. Nada pendiente: práctica de lo más frágil. Primero lo que aún no está dominado; lo dominado,
  // solo si no queda otra cosa.
  const fragile = [...learning, ...learned.filter((c) => !isMastered(c.card))]
  const pool = fragile.length > 0 ? fragile : learned
  if (pool.length > 0) {
    const pick = pickAmong(topBy(pool, riskAt(now), 3))
    return { word: pick.word, track: pick.track, reason: 'practice' }
  }

  // 7. Sin nada visto (primer día y sin cupo de nuevas): se empieza igual por la más frecuente.
  const first = gap ?? earlierGap ?? words.find((word) => available('en-es', word)) ?? words[0]
  return { word: first, track: 'en-es', reason: 'new' }
}

export interface Frontier {
  /** Posición (desde 0) de la siguiente palabra nueva del recorrido; null si ya se vieron todas. */
  rank: number | null
  /** Palabras que ya se reconocen o se están aprendiendo (tienen el primer escalón). */
  seen: number
}

/**
 * Por dónde va el recorrido secuencial: la siguiente palabra nueva desde el nivel de partida (o, si
 * desde ahí no queda ninguna, la primera anterior que falte) y cuántas se vieron ya.
 */
export function coachFrontier(progress: ProgressData, startRank = 0): Frontier {
  let rank: number | null = null
  let earlier: number | null = null
  let seen = 0
  for (const [index, word] of ALL_WORDS.entries()) {
    if (progress.cards[cardKey('en-es', word.id)]) seen++
    else if (index >= startRank) rank ??= index
    else earlier ??= index
  }
  return { rank: rank ?? earlier, seen }
}

// --- Resumen para el inicio --------------------------------------------------------------------

/** Niveles del Marco Común Europeo, con el vocabulario que suele acompañar a cada uno. */
const CEFR: Array<[words: number, label: string]> = [
  [8000, 'C2'],
  [5000, 'C1'],
  [3000, 'B2'],
  [1500, 'B1'],
  [750, 'A2'],
  [0, 'A1'],
]

export interface CoachOverview {
  /** Palabras que se reconocen (inglés → español afianzado). */
  known: number
  /** Nivel orientativo según ese vocabulario. */
  cefr: string
  /** Repasos que vencen hoy, en todas las habilidades. */
  dueToday: number
  /** Palabras en aprendizaje ahora mismo. */
  learning: number
}

export function coachOverview(progress: ProgressData, endOfToday: number): CoachOverview {
  let known = 0
  let dueToday = 0
  let learning = 0
  for (const [key, card] of Object.entries(progress.cards)) {
    if (card.due <= endOfToday) dueToday++
    if (card.phase !== 'review') learning++
    if (key.startsWith('en-es:') && card.phase === 'review' && card.stability >= RUNG_STABILITY) known++
  }
  const cefr = CEFR.find(([words]) => known >= words)?.[1] ?? 'A1'
  return { known, cefr, dueToday, learning }
}
