import { describe, expect, it } from 'vitest'
import a1 from '@/data/course/a1.json'
import a2 from '@/data/course/a2.json'
import b1 from '@/data/course/b1.json'
import b2 from '@/data/course/b2.json'
import c1 from '@/data/course/c1.json'
import c2 from '@/data/course/c2.json'
import { type CourseLevel, type Exercise, parseCourseLevel, parseExercise, parseLesson } from './course'
import { COURSE_LEVELS, type CourseLevelId } from './courseMeta'
import { judgeExercise, normalizeSentence } from './exercises'
import { isRecord } from './validate'

const RAW: Record<CourseLevelId, unknown> = { a1, a2, b1, b2, c1, c2 }
const LEVELS: CourseLevel[] = COURSE_LEVELS.map((level) => parseCourseLevel(level.id, RAW[level.id]))
/** Niveles con contenido escrito (los demás están en camino). */
const WRITTEN = LEVELS.filter((level) => level.lessons.length > 0)

/** Cada ejercicio, con dónde está, para que un fallo diga qué revisar. */
const everyExercise = (level: CourseLevel): Array<{ where: string; exercise: Exercise }> => [
  ...level.lessons.flatMap((lesson) =>
    lesson.exercises.map((exercise, i) => ({ where: `${level.id}/${lesson.id} #${i + 1}`, exercise })),
  ),
  ...level.exam.map((exercise, i) => ({ where: `${level.id}/examen #${i + 1}`, exercise })),
]

describe('validación del contenido', () => {
  it('descarta lecciones y ejercicios sin forma, sin arrastrar al resto', () => {
    expect(parseLesson({ id: 'x', title: 'T', summary: 'S', sections: [], exercises: [] })).toBeNull()
    expect(parseExercise({ type: 'choice', prompt: 'p', options: ['a', 'b'], answer: 2 })).toBeNull()
    expect(parseExercise({ type: 'fill', prompt: 'sin hueco', answers: ['a'] })).toBeNull()
    expect(parseExercise({ type: 'order', es: 'x', words: ['solo'] })).toBeNull()
    expect(parseExercise({ type: 'otro' })).toBeNull()
    const level = parseCourseLevel('a1', {
      intro: 'i',
      goals: ['g'],
      lessons: [
        {
          id: 'ok',
          title: 't',
          summary: 's',
          sections: [{ heading: 'h', body: ['p'] }],
          exercises: [{ type: 'fill', prompt: 'a ___', answers: ['b'] }],
        },
        {
          id: 'ok',
          title: 'repetida',
          summary: 's',
          sections: [{ heading: 'h', body: ['p'] }],
          exercises: [{ type: 'fill', prompt: 'a ___', answers: ['b'] }],
        },
        { id: 'MAL ID', title: 't', summary: 's', sections: [{ heading: 'h', body: ['p'] }], exercises: [] },
      ],
      exam: [{ type: 'translate', es: 'x', answers: ['y'] }, null],
    })
    expect(level.lessons.map((l) => l.title)).toEqual(['t'])
    expect(level.exam).toHaveLength(1)
    expect(parseCourseLevel('a1', 'nada')).toEqual({ id: 'a1', intro: '', goals: [], lessons: [], exam: [] })
  })
})

/** La respuesta correcta de un ejercicio, tal como la escribe su autor. */
const own = (exercise: Exercise) => {
  switch (exercise.type) {
    case 'choice':
      return exercise.answer
    case 'order':
      return exercise.words
    case 'reading':
    case 'listening':
      return exercise.questions.map((question) => question.answer)
    case 'fill':
    case 'translate':
      return exercise.answers[0]
  }
}

/** Qué está mal en un ejercicio, o null si está bien formado. */
const problem = (exercise: Exercise): string | null => {
  switch (exercise.type) {
    case 'choice':
      return new Set(exercise.options.map(normalizeSentence)).size !== exercise.options.length
        ? 'opciones repetidas'
        : exercise.options.length < 3
          ? 'menos de tres opciones'
          : null
    case 'order':
      return exercise.words.length < 3 ? 'menos de tres palabras' : null
    case 'fill':
      return exercise.prompt.split('___').length !== 2 ? 'más de un hueco' : null
    case 'translate':
      return null
    case 'reading':
    case 'listening':
      return exercise.questions.length < 2
        ? 'menos de dos preguntas'
        : exercise.questions.some((q) => new Set(q.options.map(normalizeSentence)).size !== q.options.length)
          ? 'opciones repetidas en una pregunta'
          : exercise.text.split(/\s+/).length < 30
            ? 'texto demasiado corto'
            : null
  }
}

const count = (value: unknown) => (Array.isArray(value) ? value.length : -1)
const field = (value: unknown, key: string) => (isRecord(value) ? value[key] : undefined)

/** Cuántas lecciones, secciones, ejercicios y preguntas de examen hay en el JSON tal cual. */
const rawCounts = (raw: unknown) => {
  const lessons = field(raw, 'lessons')
  return {
    lessons: Array.isArray(lessons)
      ? lessons.map((lesson) => ({
          exercises: count(field(lesson, 'exercises')),
          sections: count(field(lesson, 'sections')),
        }))
      : [],
    exam: count(field(raw, 'exam')),
  }
}

describe('contenido del curso', () => {
  it('cada nivel escrito tiene presentación, objetivos, lecciones completas y examen', () => {
    const problems: string[] = []
    for (const level of WRITTEN) {
      if (level.intro === '') problems.push(`${level.id}: sin presentación`)
      if (level.goals.length < 5) problems.push(`${level.id}: menos de cinco objetivos`)
      if (level.lessons.length < 10) problems.push(`${level.id}: menos de diez lecciones`)
      if (level.exam.length < 20) problems.push(`${level.id}: examen de menos de veinte ejercicios`)
      for (const lesson of level.lessons) {
        const where = `${level.id}/${lesson.id}`
        if (lesson.sections.length < 3) problems.push(`${where}: menos de tres secciones`)
        if (lesson.exercises.length < 8) problems.push(`${where}: menos de ocho ejercicios`)
        const examples = lesson.sections.reduce((n, s) => n + (s.examples?.length ?? 0), 0)
        if (examples < 7) problems.push(`${where}: menos de siete ejemplos`)
        const types = new Set(lesson.exercises.map((exercise) => exercise.type))
        const comprehension = types.has('reading') || types.has('listening')
        if (!comprehension && types.size < 4) problems.push(`${where}: no usa los cuatro tipos de ejercicio`)
      }
    }
    expect(problems).toEqual([])
  })

  it('ningún ejercicio se pierde al validar (lo escrito en el JSON es exactamente lo que se usa)', () => {
    for (const level of WRITTEN) {
      const parsed = {
        lessons: level.lessons.map((lesson) => ({
          exercises: lesson.exercises.length,
          sections: lesson.sections.length,
        })),
        exam: level.exam.length,
      }
      expect({ level: level.id, ...parsed }).toEqual({ level: level.id, ...rawCounts(RAW[level.id]) })
    }
  })

  it('cada ejercicio se puede resolver con su propia respuesta', () => {
    for (const level of WRITTEN) {
      const unsolvable = everyExercise(level)
        .filter(({ exercise }) => judgeExercise(exercise, own(exercise)) !== 'correct')
        .map(({ where }) => where)
      expect({ level: level.id, unsolvable }).toEqual({ level: level.id, unsolvable: [] })
    }
  })

  it('las opciones no se repiten, ordenar tiene al menos tres palabras y completar un solo hueco', () => {
    for (const level of WRITTEN) {
      const problems = everyExercise(level)
        .map(({ where, exercise }) => ({ where, problem: problem(exercise) }))
        .filter(({ problem: found }) => found !== null)
      expect({ level: level.id, problems }).toEqual({ level: level.id, problems: [] })
    }
  })

  it('cada nivel tiene comprensión lectora y auditiva, en las lecciones y en el examen', () => {
    const problems: string[] = []
    for (const level of WRITTEN) {
      const all = everyExercise(level).map(({ exercise }) => exercise)
      const lessonTypes = new Set(level.lessons.flatMap((lesson) => lesson.exercises.map((e) => e.type)))
      const examTypes = new Set(level.exam.map((e) => e.type))
      if (!lessonTypes.has('reading')) problems.push(`${level.id}: sin lectura en las lecciones`)
      if (!lessonTypes.has('listening')) problems.push(`${level.id}: sin escucha en las lecciones`)
      if (!examTypes.has('reading') || !examTypes.has('listening'))
        problems.push(`${level.id}: el examen no evalúa comprensión`)
      if (all.filter((e) => e.type === 'reading' || e.type === 'listening').length < 8)
        problems.push(`${level.id}: menos de ocho textos de comprensión`)
    }
    expect(problems).toEqual([])
  })

  it('los ids de lección son únicos en todo el curso', () => {
    const ids = WRITTEN.flatMap((level) => level.lessons.map((lesson) => `${level.id}/${lesson.id}`))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
