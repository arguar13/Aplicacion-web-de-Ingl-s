/**
 * Audio grabado de las frases del curso (ejemplos y respuestas), con la misma voz neuronal que
 * las palabras. Cada frase se identifica por un hash de su texto, igual aquí y en
 * scripts/generate_course_audio.py: `audio/course/<hash>.mp3`. Si la grabación no existe (aún no
 * se generó, o cambió el texto), la frase se lee con la voz del navegador.
 */
import { useSyncExternalStore } from 'react'
import { loadAudioVersions } from './audioUrl'

const encoder = new TextEncoder()

/** FNV-1a de 32 bits sobre los bytes UTF-8 del texto, con la semilla indicada. */
function fnv1a(text: string, seed: number): number {
  let hash = seed >>> 0
  for (const byte of encoder.encode(text)) {
    hash ^= byte
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

const SEED_A = 2166136261
const SEED_B = (0x811c9dc5 ^ 0x5bd1e995) >>> 0

/** Texto comparable: espacios colapsados y sin los de los extremos (como hace el script). */
export const normalizeSentence = (text: string) => text.split(/\s+/).filter(Boolean).join(' ')

const hex = (value: number) => value.toString(16).padStart(8, '0')

/** Id de audio de una frase: dos hashes de 32 bits (16 hex) bajo `course/`. */
export function courseAudioId(text: string): string {
  const normalized = normalizeSentence(text)
  return `course/${hex(fnv1a(normalized, SEED_A))}${hex(fnv1a(normalized, SEED_B))}`
}

// --- Qué grabaciones existen ---------------------------------------------------------------------

let versions: Readonly<Record<string, string>> | null = null
let requested = false
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function ensureVersions() {
  if (requested) return
  requested = true
  loadAudioVersions().then(
    (all) => {
      versions = all
      for (const listener of listeners) listener()
    },
    () => undefined,
  )
}

/** Id de la grabación de una frase si existe (según el mapa de versiones del build); null si no. */
export function useRecordedSentence(text: string): string | null {
  const all = useSyncExternalStore(
    subscribe,
    () => versions,
    () => null,
  )
  ensureVersions()
  const id = courseAudioId(text)
  return all && id in all ? id : null
}

/** Ids de todas las grabaciones del curso publicadas (para descargarlas sin conexión). */
export const recordedCourseIds = (all: Readonly<Record<string, string>>) =>
  Object.keys(all).filter((id) => id.startsWith('course/'))
