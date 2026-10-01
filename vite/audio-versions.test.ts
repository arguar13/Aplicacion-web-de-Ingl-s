import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { computeAudioVersions } from './audio-versions.ts'

const temps: string[] = []

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true })
})

// Que cada palabra tenga su MP3 lo comprueba src/lib/quiz.test.ts, y que el build pida las URLs
// versionadas, e2e/offline.spec.ts. Aquí basta una carpeta pequeña: hashear 22 MB no aporta nada.
describe('versiones de audio', () => {
  it('la versión cambia si cambia el contenido y solo entonces', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tecla-audio-'))
    temps.push(dir)
    writeFileSync(join(dir, 'hello.mp3'), 'uno')
    writeFileSync(join(dir, 'world.mp3'), 'dos')
    writeFileSync(join(dir, 'notas.txt'), 'no es audio')
    const before = computeAudioVersions(dir)
    expect(Object.keys(before)).toEqual(['hello', 'world'])

    writeFileSync(join(dir, 'hello.mp3'), 'uno, regenerado')
    const after = computeAudioVersions(dir)
    expect(after.hello).not.toBe(before.hello)
    expect(after.world).toBe(before.world)
  })

  it('las frases grabadas del curso (carpeta course/) llevan su prefijo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tecla-audio-'))
    temps.push(dir)
    writeFileSync(join(dir, 'hello.mp3'), 'uno')
    mkdirSync(join(dir, 'course'))
    writeFileSync(join(dir, 'course', 'd542072491814dd3.mp3'), 'frase')
    expect(Object.keys(computeAudioVersions(dir))).toEqual(['hello', 'course/d542072491814dd3'])
  })
})
