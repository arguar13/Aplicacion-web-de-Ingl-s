import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import words from '../src/data/words.json'
import { computeAudioVersions } from './audio-versions.ts'

const AUDIO_DIR = fileURLToPath(new URL('../public/audio', import.meta.url))
const temps: string[] = []

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('versiones de audio', () => {
  it('cada palabra del vocabulario tiene versión', () => {
    const versions = computeAudioVersions(AUDIO_DIR)
    expect(words.filter((w) => !versions[w.id]).map((w) => w.id)).toEqual([])
    expect(Object.values(versions).every((v) => /^[0-9a-f]{8}$/.test(v))).toBe(true)
  })

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
})
