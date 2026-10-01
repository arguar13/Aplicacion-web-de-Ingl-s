import { readFileSync, writeFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import words from '@/data/words.json'
import { COURSE_LEVELS } from '@/lib/courseMeta'
import { TOPICS } from '@/lib/topicMeta'
import { isRecord } from '@/lib/validate'
import { SHOWCASE, WelcomeShell } from './Welcome'

const INDEX = new URL('../../index.html', import.meta.url)

/** Lecciones de un nivel del curso, leídas de sus datos. */
function lessonsIn(id: string): number {
  const data: unknown = JSON.parse(readFileSync(new URL(`../data/course/${id}.json`, import.meta.url), 'utf8'))
  return isRecord(data) && Array.isArray(data.lessons) ? data.lessons.length : 0
}

describe('bienvenida pintada desde el HTML', () => {
  // Tras cambiar la bienvenida: WRITE_WELCOME=1 npx vitest run src/components/Welcome.test.tsx
  it.runIf(process.env.WRITE_WELCOME === '1')('regenera la copia de index.html', () => {
    const html = readFileSync(INDEX, 'utf8')
    const markup = renderToStaticMarkup(<WelcomeShell />)
    writeFileSync(INDEX, html.replace(/(<template id="bienvenida">)[\s\S]*?(<\/template>)/, `$1${markup}$2`))
    expect(readFileSync(INDEX, 'utf8')).toContain(markup)
  })

  it('la copia de index.html es idéntica a la de la app (si no, regenerarla: ver arriba)', () => {
    const html = readFileSync(INDEX, 'utf8')
    const template = /<template id="bienvenida">([\s\S]*?)<\/template>/.exec(html)?.[1]
    expect(template).toBe(renderToStaticMarkup(<WelcomeShell />))
  })

  it('todos sus botones se anuncian como inactivos hasta que llega la app', () => {
    const markup = renderToStaticMarkup(<WelcomeShell />)
    const buttons = markup.match(/<button[\s>]/g) ?? []
    expect(buttons.length).toBeGreaterThan(3)
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(buttons.length)
  })

  it('las cifras que muestra coinciden con los datos de la app', () => {
    expect(SHOWCASE.words).toBe(words.length)
    expect(SHOWCASE.levels).toBe(COURSE_LEVELS.length)
    expect(SHOWCASE.topics).toBe(TOPICS.length)
    const lessons = COURSE_LEVELS.reduce((sum, level) => sum + lessonsIn(level.id), 0)
    expect(SHOWCASE.lessons).toBe(lessons)
  })
})
