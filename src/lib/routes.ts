/**
 * Rutas de la app, en el hash de la URL: `#/`, `#/nivel/3`, `#/todas`, `#/repaso`… con
 * `?panel=ajustes` o `?palabra=<id>` para abrir un panel sobre la pantalla actual.
 *
 * Se usa el hash y no la History API porque el build usa rutas relativas (`base: './'`) para poder
 * desplegarse en la raíz o en una subcarpeta de Hostinger: con `/nivel/3` en la ruta, los archivos
 * relativos se buscarían en `/nivel/assets/…`. Con el hash, el servidor siempre sirve index.html, el
 * service worker no necesita reglas extra y los enlaces directos funcionan sin conexión.
 */
import { type CourseLevelId, courseLevelInfo, isCourseLevelId } from './courseMeta'
import { ALL_DECK, ALL_WORDS, type Deck, LEVELS } from './decks'
import type { SmartDeckKind } from './smartDecks'
import { isTopicId, topicInfo, type TopicId } from './topicMeta'

/** Panel sobre la pantalla: los ajustes, los atajos de teclado o la ficha de una palabra. */
export type Panel = 'settings' | 'shortcuts' | { word: string }

/** Pantallas sin parámetros: su ruta y el título de la pestaña. */
const SIMPLE_SCREENS = {
  coach: { path: '/sesion', title: 'Sesión inteligente' },
  course: { path: '/curso', title: 'Curso de inglés' },
  focus: { path: '/enfoque', title: 'Modo concentración' },
  topics: { path: '/colecciones', title: 'Colecciones' },
  blitz: { path: '/relampago', title: 'Relámpago' },
  stats: { path: '/estadisticas', title: 'Tu progreso' },
  dictionary: { path: '/diccionario', title: 'Diccionario' },
} as const
type SimpleScreen = keyof typeof SIMPLE_SCREENS
const SIMPLE_NAMES = Object.keys(SIMPLE_SCREENS).filter((name): name is SimpleScreen => name in SIMPLE_SCREENS)

export type Screen =
  | { name: 'home' }
  | { name: 'deck'; deck: Deck }
  | { name: 'smart'; kind: SmartDeckKind }
  | { name: 'topic'; topic: TopicId }
  | { name: 'courseLevel'; level: CourseLevelId }
  | { name: 'lesson'; level: CourseLevelId; lesson: string }
  | { name: 'exam'; level: CourseLevelId }
  /** Quiz de un nivel, o el mixto de todos (`level: null`). */
  | { name: 'quiz'; level: CourseLevelId | null }
  | { name: SimpleScreen }

export interface Route {
  screen: Screen
  panel: Panel | null
}

export const HOME: Route = { screen: { name: 'home' }, panel: null }

const SMART: Record<SmartDeckKind, { path: string; title: string }> = {
  review: { path: '/repaso', title: 'Repaso del día' },
  hard: { path: '/dificiles', title: 'Mis difíciles' },
  favorites: { path: '/favoritas', title: 'Favoritas' },
}
const SMART_KINDS: readonly SmartDeckKind[] = ['review', 'hard', 'favorites']
const WORD_IDS = new Set(ALL_WORDS.map((word) => word.id))

function deckPath(deck: Deck): string {
  return deck.level === null ? '/todas' : `/nivel/${deck.level}`
}

function deckFromPath(path: string): Deck | undefined {
  if (path === '/todas') return ALL_DECK
  const match = /^\/nivel\/(\d+)$/.exec(path)
  return match ? LEVELS.find((deck) => deck.level === Number(match[1])) : undefined
}

function parsePanel(query: string): Panel | null {
  const params = new URLSearchParams(query)
  if (params.get('panel') === 'ajustes') return 'settings'
  if (params.get('panel') === 'atajos') return 'shortcuts'
  const word = params.get('palabra')
  return word && WORD_IDS.has(word) ? { word } : null
}

function parseScreen(path: string): Screen | null {
  if (path === '/') return { name: 'home' }
  const simple = SIMPLE_NAMES.find((name) => SIMPLE_SCREENS[name].path === path)
  if (simple) return { name: simple }
  const smart = SMART_KINDS.find((kind) => SMART[kind].path === path)
  if (smart) return { name: 'smart', kind: smart }
  const topic = /^\/tema\/([a-z]+)$/.exec(path)?.[1]
  if (topic) return isTopicId(topic) ? { name: 'topic', topic } : null
  if (path === '/curso/quiz') return { name: 'quiz', level: null }
  const course = /^\/curso\/([a-z0-9]+)(?:\/([a-z0-9-]+))?$/.exec(path)
  if (course) {
    const [, level, rest] = course
    if (!isCourseLevelId(level)) return null
    if (rest === undefined) return { name: 'courseLevel', level }
    if (rest === 'examen') return { name: 'exam', level }
    if (rest === 'quiz') return { name: 'quiz', level }
    return { name: 'lesson', level, lesson: rest }
  }
  const deck = deckFromPath(path)
  return deck ? { name: 'deck', deck } : null
}

/** Convierte el hash de la URL en una ruta. Lo que no se reconoce lleva al inicio. */
export function parseHash(hash: string): Route {
  const [rawPath = '', query = ''] = hash.replace(/^#/, '').split('?')
  const path = rawPath.replace(/\/+$/, '') || '/'
  const screen = parseScreen(path)
  return screen ? { screen, panel: parsePanel(query) } : HOME
}

function screenPath(screen: Screen): string {
  switch (screen.name) {
    case 'home':
      return '/'
    case 'deck':
      return deckPath(screen.deck)
    case 'smart':
      return SMART[screen.kind].path
    case 'topic':
      return `/tema/${screen.topic}`
    case 'courseLevel':
      return `/curso/${screen.level}`
    case 'lesson':
      return `/curso/${screen.level}/${screen.lesson}`
    case 'exam':
      return `/curso/${screen.level}/examen`
    case 'quiz':
      return screen.level === null ? '/curso/quiz' : `/curso/${screen.level}/quiz`
    case 'coach':
    case 'course':
    case 'focus':
    case 'topics':
    case 'blitz':
    case 'stats':
    case 'dictionary':
      return SIMPLE_SCREENS[screen.name].path
  }
}

function panelQuery(panel: Panel | null): string {
  if (panel === null) return ''
  if (panel === 'settings') return '?panel=ajustes'
  if (panel === 'shortcuts') return '?panel=atajos'
  return `?palabra=${panel.word}`
}

export function formatHash(route: Route): string {
  return `#${screenPath(route.screen)}${panelQuery(route.panel)}`
}

/** Título de la pestaña para cada pantalla. */
export function titleOf(route: Route): string {
  const { screen } = route
  switch (screen.name) {
    case 'home':
      return 'OpenSpeak · Aprende inglés de A1 a C2'
    case 'deck':
      return `${screen.deck.level === null ? screen.deck.name : `Nivel ${screen.deck.level} · ${screen.deck.name}`} — OpenSpeak`
    case 'smart':
      return `${SMART[screen.kind].title} — OpenSpeak`
    case 'topic':
      return `${topicInfo(screen.topic).name} — OpenSpeak`
    case 'courseLevel':
      return `Curso ${courseLevelInfo(screen.level).name} — OpenSpeak`
    case 'lesson':
      return `Lección ${courseLevelInfo(screen.level).name} — OpenSpeak`
    case 'exam':
      return `Examen ${courseLevelInfo(screen.level).name} — OpenSpeak`
    case 'quiz':
      return screen.level === null ? 'Quiz mixto — OpenSpeak' : `Quiz ${courseLevelInfo(screen.level).name} — OpenSpeak`
    case 'coach':
    case 'course':
    case 'focus':
    case 'topics':
    case 'blitz':
    case 'stats':
    case 'dictionary':
      return `${SIMPLE_SCREENS[screen.name].title} — OpenSpeak`
  }
}

export const sameScreen = (a: Screen, b: Screen) => screenPath(a) === screenPath(b)
