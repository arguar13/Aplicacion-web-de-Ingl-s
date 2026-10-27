/**
 * Textos para entrenar el oído y la pronunciación: lecturas graduadas de A1 a C2, frase a frase y
 * con su traducción. Viven en src/data/texts.json y se cargan al abrir la biblioteca (no los
 * necesita el inicio). Cada frase tiene grabación con la voz neuronal del curso (mismo hash que
 * courseAudio.ts, ver scripts/generate_course_audio.py) o, si no, se lee con la voz del navegador.
 */
import textsUrl from '@/data/texts.json?url'
import { useSyncExternalStore } from 'react'
import { COURSE_LEVELS, type CourseLevelId, isCourseLevelId } from './courseMeta'
import { isRecord } from './validate'

export interface Sentence {
  en: string
  es: string
}

export interface StudyText {
  id: string
  level: CourseLevelId
  /** Título en inglés y su traducción. */
  title: string
  titleEs: string
  /** Tema, en español: «Viajes», «Trabajo»… */
  topic: string
  paragraphs: Sentence[][]
}

/** Textos de la biblioteca (lo comprueba un test contra src/data/texts.json): el inicio lo muestra sin cargarlos. */
export const TEXT_COUNT = 36

/** Palabras por minuto con que se calcula cuánto dura escuchar un texto (lectura pausada de la grabación). */
const WORDS_PER_MINUTE = 130

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

function parseSentence(raw: unknown): Sentence | null {
  if (!isRecord(raw) || !isText(raw.en) || !isText(raw.es)) return null
  return { en: raw.en.trim(), es: raw.es.trim() }
}

function parseText(raw: unknown): StudyText | null {
  if (!isRecord(raw)) return null
  const { id, level, title, titleEs, topic, paragraphs } = raw
  if (!isText(id) || !/^[a-z0-9-]+$/.test(id) || typeof level !== 'string' || !isCourseLevelId(level)) return null
  if (!isText(title) || !isText(titleEs) || !isText(topic) || !Array.isArray(paragraphs)) return null
  const parsed = paragraphs
    .map((paragraph) =>
      Array.isArray(paragraph)
        ? paragraph.map(parseSentence).filter((sentence): sentence is Sentence => sentence !== null)
        : [],
    )
    .filter((paragraph) => paragraph.length > 0)
  if (parsed.length === 0) return null
  return { id, level, title, titleEs, topic, paragraphs: parsed }
}

const levelOrder = (level: CourseLevelId) => COURSE_LEVELS.findIndex((info) => info.id === level)

/** Valida la biblioteca: lo dañado se descarta sin arrastrar al resto; los ids no se repiten. */
export function parseTexts(raw: unknown): StudyText[] {
  if (!isRecord(raw) || !Array.isArray(raw.texts)) return []
  const seen = new Set<string>()
  const texts: StudyText[] = []
  for (const entry of raw.texts) {
    const text = parseText(entry)
    if (text && !seen.has(text.id)) {
      seen.add(text.id)
      texts.push(text)
    }
  }
  return texts.toSorted((a, b) => levelOrder(a.level) - levelOrder(b.level))
}

/** Las frases de un texto, en orden, sin los párrafos. */
export const sentencesOf = (text: StudyText): Sentence[] => text.paragraphs.flat()

/** Palabras de un texto (para la duración y la nota de lectura). */
export const wordCount = (text: StudyText) =>
  sentencesOf(text).reduce((sum, sentence) => sum + sentence.en.split(/\s+/).length, 0)

/** Minutos aproximados de escucha, redondeados hacia arriba. */
export const listeningMinutes = (text: StudyText) => Math.max(1, Math.ceil(wordCount(text) / WORDS_PER_MINUTE))

// --- Carga diferida -------------------------------------------------------------------------------

export type TextsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; texts: StudyText[] }

const LOADING: TextsState = { status: 'loading' }
let state: TextsState | null = null
let pending: Promise<StudyText[]> | null = null
const listeners = new Set<() => void>()

function setState(next: TextsState) {
  state = next
  for (const listener of listeners) listener()
}

/** Carga (una sola vez) la biblioteca. Si falla la red, se reintenta en la próxima petición. */
export function loadTexts(): Promise<StudyText[]> {
  if (state?.status === 'ready') return Promise.resolve(state.texts)
  // Pedida: deja de estar «sin pedir» (sin avisar: aún no hay nada nuevo que pintar).
  state ??= LOADING
  pending ??= fetch(textsUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`No se pudo cargar la biblioteca (HTTP ${response.status})`)
      return response.json() as Promise<unknown>
    })
    .then((raw) => {
      const texts = parseTexts(raw)
      setState({ status: 'ready', texts })
      return texts
    })
    .catch((error: unknown) => {
      setState({ status: 'error' })
      throw error
    })
    .finally(() => {
      pending = null
    })
  return pending
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** La biblioteca; mientras carga, `loading`; si no se pudo, `error` hasta reintentar. Pedirla empieza la carga. */
export function useTexts(): TextsState {
  const current = useSyncExternalStore(
    subscribe,
    () => state ?? LOADING,
    () => LOADING,
  )
  if (state === null) loadTexts().catch(() => undefined)
  return current
}

/** Vuelve a intentar la carga tras un error. */
export function retryTexts() {
  if (state?.status === 'error') state = null
  loadTexts().catch(() => undefined)
}

/** Para tests: fija la biblioteca sin pasar por la red. */
export function setTexts(texts: StudyText[]) {
  setState({ status: 'ready', texts })
}
