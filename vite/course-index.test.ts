import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import index from 'virtual:course-index'
import { describe, expect, it } from 'vitest'
import { parseCourseLevel } from '../src/lib/course.ts'
import { COURSE_LEVELS } from '../src/lib/courseMeta.ts'
import { buildCourseIndex, lessonIndex } from './course-index.ts'

const DIR = fileURLToPath(new URL('../src/data/course', import.meta.url))

describe('índice del curso', () => {
  it('tiene las mismas lecciones, en el mismo orden, que el contenido que carga la app', () => {
    const fromContent = Object.fromEntries(
      COURSE_LEVELS.map((level) => {
        const raw: unknown = JSON.parse(readFileSync(`${DIR}/${level.id}.json`, 'utf8'))
        return [level.id, parseCourseLevel(level.id, raw).lessons.map(({ id, title }) => ({ id, title }))]
      }),
    )
    expect(index).toEqual(fromContent)
    expect(buildCourseIndex(DIR)).toEqual(index)
  })

  it('ignora lo que no tiene id o título, y los repetidos', () => {
    expect(lessonIndex({ lessons: [{ id: 'a', title: 'A' }, { id: 'a', title: 'B' }, { title: 'C' }, 4] })).toEqual([
      { id: 'a', title: 'A' },
    ])
    expect(lessonIndex(null)).toEqual([])
  })
})
