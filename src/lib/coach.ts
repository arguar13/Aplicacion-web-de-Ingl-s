/**
 * Entrenador de la sesión inteligente: decide qué practicar en cada ronda, sin elegir niveles.
 *
 * - **Lo fallado vuelve** a las pocas rondas en la misma sesión, y luego según FSRS.
 * - **Repasos primero:** lo que vence, empezando por lo que más riesgo tiene de olvidarse.
 * - **Escalera de habilidades:** cada palabra se aprende primero reconociéndola (inglés → español),
 *   luego recordándola (español → inglés), después de oído y por último escribiéndola. Sube de
 *   escalón cuando el anterior está afianzado.
 * - **Palabras nuevas en orden de frecuencia**, a un ritmo que se adapta: se introducen mientras las
 *   que están en aprendizaje sean pocas para ese ritmo. Quien acierta casi todo y rápido "acelera":
 *   las nuevas se toman más adelante en la lista (más difíciles) y lo que ya sabía se aleja como
 *   fácil. Con errores se "afianza": menos palabras a la vez hasta consolidar.
 *
 * Todo sale del progreso y del historial guardados: no hay estado propio que pueda desincronizarse.
 */
import { ALL_WORDS } from './decks'
import type { StudyEvent } from './events'
import { cardKey, type ProgressData } from './progress'
import { type CardState, FAST_ANSWER_MS, isMastered, type Session } from './scheduler'
import type { Mode, Rng, Track, Word } from './types'

/** Escalones de la escalera de habilidades, en orden. */
export const LADDER: readonly Track[] = ['en-es', 'es-en', 'listen', 'type']
/** Estabilidad (días) a partir de la cual un escalón está afianzado y la palabra sube al siguiente. */
export const RUNG_STABILITY = 4

export type Pace = 'steady' | 'normal' | 'fast'

/** Palabras en aprendizaje a la vez (aún en pasos cortos) según el ritmo. */
export const WORKING_SET: Record<Pace, number> = { steady: 5, normal: 9, fast: 14 }
/** Al acelerar, cuánto se adelanta en la lista de frecuencia la siguiente palabra nueva. */
export const FAST_JUMP = 12
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

export type CoachReason = 'relearn' | 'review' | 'skill' | 'new' | 'practice'

export interface CoachPick {
  word: Word
  track: Track
  reason: CoachReason
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
  const learned: Candidate[] = []
  let working = 0
  let skill: CoachPick | null = null
  let gap: Word | null = null
  let earlierGap: Word | null = null
  let furthestSeen = -1
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
      if (card.due <= now) due.push({ word, track, card })
      else learned.push({ word, track, card })
    }
    if (firstMissing !== 0) furthestSeen = rank
    // Sin el primer escalón, la palabra es nueva. Si falta otro, se sube a él cuando el anterior
    // está afianzado. En los dos casos gana la palabra más frecuente (la primera que aparece).
    if (firstMissing === 0 && available('en-es', word)) {
      if (rank >= startRank) gap ??= word
      else earlierGap ??= word
    }
    if (firstMissing > 0 && !skill) {
      const track = LADDER[firstMissing]
      const previous = cards[keyOf(LADDER[firstMissing - 1], word)]
      if (previous && previous.stability >= RUNG_STABILITY && available(track, word)) {
        skill = { word, track, reason: 'skill' }
      }
    }
  }

  // 3. Repasos vencidos: los de más riesgo de olvido primero (más tiempo pasado respecto de su
  // estabilidad), con algo de variedad entre los tres más urgentes.
  if (due.length > 0) {
    const risk = (c: Candidate) => (now - c.card.last) / c.card.stability
    due.sort((a, b) => risk(b) - risk(a))
    const pick = due[Math.floor(rng() * Math.min(3, due.length))]
    return { word: pick.word, track: pick.track, reason: 'review' }
  }

  gap ??= earlierGap

  // 4. Algo nuevo, si lo que está en aprendizaje cabe en el ritmo: subir de escalón o una palabra.
  if (working < WORKING_SET[learner.pace]) {
    const next = allowNew ? newWord(words, cards, gap, furthestSeen, learner, available) : null
    // Subir de escalón no gasta el cupo de nuevas; con los dos disponibles, se alternan.
    if (skill && (!next || rng() < 0.4)) return skill
    if (next) return { word: next, track: 'en-es', reason: 'new' }
  }

  // 5. Nada pendiente: práctica de lo más frágil (torneo entre unas cuantas ya vistas).
  if (learned.length > 0) {
    const strength = (c: Candidate) => c.card.stability + (isMastered(c.card) ? 1000 : 0)
    let best = learned[Math.floor(rng() * learned.length)]
    for (let i = 0; i < 5; i++) {
      const other = learned[Math.floor(rng() * learned.length)]
      if (strength(other) < strength(best)) best = other
    }
    return { word: best.word, track: best.track, reason: 'practice' }
  }

  // 6. Sin nada visto (primer día y sin cupo de nuevas): se empieza igual por la más frecuente.
  const first = gap ?? words.find((word) => available('en-es', word)) ?? words[0]
  return { word: first, track: 'en-es', reason: 'new' }
}

/**
 * La siguiente palabra nueva. Por frecuencia: la más usada que aún no se vio. Al acelerar, se
 * adelanta FAST_JUMP puestos desde la más lejana ya vista: palabras más difíciles, y los huecos
 * que deja se rellenan en cuanto el ritmo vuelve a normal (si ya se sabían, se aprueban rápido).
 */
function newWord(
  words: readonly Word[],
  cards: ProgressData['cards'],
  gap: Word | null,
  furthestSeen: number,
  learner: Learner,
  available: (track: Track, word: Word) => boolean,
): Word | null {
  if (learner.pace !== 'fast') return gap
  for (let rank = Math.max(0, furthestSeen + FAST_JUMP); rank < words.length; rank++) {
    const word = words[rank]
    if (!cards[keyOf('en-es', word)] && available('en-es', word)) return word
  }
  return gap
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
