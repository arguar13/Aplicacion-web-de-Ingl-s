/**
 * Plugin de Vite: el índice del curso (id y título de cada lección, por nivel) como módulo
 * `virtual:course-index`. El plan de estudio y su tarjeta del inicio necesitan saber qué lecciones
 * hay sin descargar los seis niveles completos (~220 KB cada uno): el índice ocupa unos pocos KB.
 * Sale de los mismos src/data/course/<nivel>.json, así que nunca se desincroniza del contenido.
 */
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { isRecord } from '../src/lib/validate.ts'

const VIRTUAL_ID = 'virtual:course-index'
const RESOLVED_ID = `\0${VIRTUAL_ID}`
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const

export type CourseIndex = Record<(typeof LEVELS)[number], Array<{ id: string; title: string }>>

/** Lecciones de un nivel, tal como las lee la app (las que no tienen id o título no cuentan). */
export function lessonIndex(raw: unknown): Array<{ id: string; title: string }> {
  if (!isRecord(raw) || !Array.isArray(raw.lessons)) return []
  const seen = new Set<string>()
  return raw.lessons.flatMap((lesson: unknown) => {
    if (!isRecord(lesson) || typeof lesson.id !== 'string' || typeof lesson.title !== 'string') return []
    if (seen.has(lesson.id)) return []
    seen.add(lesson.id)
    return [{ id: lesson.id, title: lesson.title }]
  })
}

const readLevel = (dir: string, level: string) => {
  const raw: unknown = JSON.parse(readFileSync(`${dir}/${level}.json`, 'utf8'))
  return lessonIndex(raw)
}

export function buildCourseIndex(dir: string): CourseIndex {
  return {
    a1: readLevel(dir, 'a1'),
    a2: readLevel(dir, 'a2'),
    b1: readLevel(dir, 'b1'),
    b2: readLevel(dir, 'b2'),
    c1: readLevel(dir, 'c1'),
    c2: readLevel(dir, 'c2'),
  }
}

export function courseIndex(dir: string): Plugin {
  return {
    name: 'tecla-course-index',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      for (const level of LEVELS) this.addWatchFile(`${dir}/${level}.json`)
      return `export default ${JSON.stringify(buildCourseIndex(dir))}`
    },
  }
}
