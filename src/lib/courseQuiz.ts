/**
 * Quizzes del curso: una tanda corta de preguntas al azar sacadas de las lecciones y el examen de un
 * nivel (o de todos los niveles), distinta cada vez. Sirven para repasar sin releer, y suman
 * experiencia.
 */
import type { CourseLevel, Exercise } from './course'
import { shuffle } from './quiz'
import { seededRng } from './seed'

/** Preguntas de un quiz de nivel y del quiz mixto. */
export const QUIZ_SIZE = 10
export const MIXED_QUIZ_SIZE = 12

/** Todas las preguntas de un nivel: las de sus lecciones y las del examen. */
export function quizPool(level: CourseLevel): Exercise[] {
  return [...level.lessons.flatMap((lesson) => lesson.exercises), ...level.exam]
}

/**
 * Elige `size` preguntas del fondo con una semilla (misma semilla, mismo quiz), repartiendo los
 * tipos: primero se baraja todo y luego se evita que un tipo ocupe más de la mitad si hay otros.
 */
export function buildQuiz(pool: readonly Exercise[], seed: number, size = QUIZ_SIZE): Exercise[] {
  const shuffled = shuffle(pool, seededRng(seed))
  const limit = Math.max(1, Math.ceil(size / 2))
  const counts = new Map<Exercise['type'], number>()
  const chosen: Exercise[] = []
  const skipped: Exercise[] = []
  for (const exercise of shuffled) {
    if (chosen.length >= size) break
    const count = counts.get(exercise.type) ?? 0
    if (count >= limit) {
      skipped.push(exercise)
      continue
    }
    counts.set(exercise.type, count + 1)
    chosen.push(exercise)
  }
  // Si el fondo es pequeño o de un solo tipo, se completa con lo apartado.
  for (const exercise of skipped) {
    if (chosen.length >= size) break
    chosen.push(exercise)
  }
  return chosen
}

/** Quiz mixto: preguntas de varios niveles, repartidas entre ellos. */
export function buildMixedQuiz(levels: readonly CourseLevel[], seed: number, size = MIXED_QUIZ_SIZE): Exercise[] {
  const pools = levels.map((level) => shuffle(quizPool(level), seededRng(seed + level.id.charCodeAt(1))))
  const chosen: Exercise[] = []
  // Uno de cada nivel por turno: así el quiz no se llena solo del nivel con más preguntas.
  for (let round = 0; chosen.length < size; round++) {
    let added = false
    for (const pool of pools) {
      const exercise = pool[round]
      if (exercise && chosen.length < size) {
        chosen.push(exercise)
        added = true
      }
    }
    if (!added) break
  }
  return shuffle(chosen, seededRng(seed))
}

/** Semilla de un intento: cambia con el momento y con cada "otro quiz". */
export const quizSeed = (now: number, attempt: number) => (Math.floor(now / 1000) + attempt * 7919) >>> 0
