/**
 * Rutas de la app, en el hash de la URL: `#/`, `#/nivel/3`, `#/todas`, con `?panel=ajustes` para
 * abrir un panel sobre la pantalla actual.
 *
 * Se usa el hash y no la History API porque el build usa rutas relativas (`base: './'`) para poder
 * desplegarse en la raíz o en una subcarpeta de Hostinger: con `/nivel/3` en la ruta, los archivos
 * relativos se buscarían en `/nivel/assets/…`. Con el hash, el servidor siempre sirve index.html, el
 * service worker no necesita reglas extra y los enlaces directos funcionan sin conexión.
 */
import { ALL_DECK, type Deck, LEVELS } from './decks'
import type { SmartDeckKind } from './smartDecks'

const PANELS = ['settings'] as const
export type Panel = (typeof PANELS)[number]
export type Screen =
  | { name: 'home' }
  | { name: 'deck'; deck: Deck }
  | { name: 'smart'; kind: SmartDeckKind }
  | { name: 'blitz' }
  | { name: 'stats' }

export interface Route {
  screen: Screen
  panel: Panel | null
}

export const HOME: Route = { screen: { name: 'home' }, panel: null }

const PANEL_SLUGS: Record<Panel, string> = { settings: 'ajustes' }
const BLITZ_PATH = '/relampago'
const STATS_PATH = '/estadisticas'
const SMART_KINDS: readonly SmartDeckKind[] = ['review', 'hard']
const SMART_PATHS: Record<SmartDeckKind, string> = { review: '/repaso', hard: '/dificiles' }
const SMART_TITLES: Record<SmartDeckKind, string> = { review: 'Repaso del día', hard: 'Mis difíciles' }

function deckPath(deck: Deck): string {
  return deck.level === null ? '/todas' : `/nivel/${deck.level}`
}

function deckFromPath(path: string): Deck | undefined {
  if (path === '/todas') return ALL_DECK
  const match = /^\/nivel\/(\d+)$/.exec(path)
  return match ? LEVELS.find((deck) => deck.level === Number(match[1])) : undefined
}

/** Convierte el hash de la URL en una ruta. Lo que no se reconoce lleva al inicio. */
export function parseHash(hash: string): Route {
  const [rawPath = '', query = ''] = hash.replace(/^#/, '').split('?')
  const path = rawPath.replace(/\/+$/, '') || '/'
  const panelSlug = new URLSearchParams(query).get('panel')
  const panel = PANELS.find((p) => PANEL_SLUGS[p] === panelSlug) ?? null

  if (path === '/') return { screen: { name: 'home' }, panel }
  if (path === BLITZ_PATH) return { screen: { name: 'blitz' }, panel }
  if (path === STATS_PATH) return { screen: { name: 'stats' }, panel }
  const smart = SMART_KINDS.find((kind) => SMART_PATHS[kind] === path)
  if (smart) return { screen: { name: 'smart', kind: smart }, panel }
  const deck = deckFromPath(path)
  return deck ? { screen: { name: 'deck', deck }, panel } : HOME
}

export function formatHash(route: Route): string {
  const { screen } = route
  const path =
    screen.name === 'deck'
      ? deckPath(screen.deck)
      : screen.name === 'smart'
        ? SMART_PATHS[screen.kind]
        : screen.name === 'blitz'
          ? BLITZ_PATH
          : screen.name === 'stats'
            ? STATS_PATH
            : '/'
  return `#${path}${route.panel ? `?panel=${PANEL_SLUGS[route.panel]}` : ''}`
}

/** Título de la pestaña para cada pantalla. */
export function titleOf(route: Route): string {
  const base = 'Tecla · Vocabulario en inglés'
  if (route.screen.name === 'home') return base
  if (route.screen.name === 'smart') return `${SMART_TITLES[route.screen.kind]} — Tecla`
  if (route.screen.name === 'blitz') return 'Relámpago — Tecla'
  if (route.screen.name === 'stats') return 'Tu progreso — Tecla'
  const { deck } = route.screen
  return `${deck.level === null ? deck.name : `Nivel ${deck.level} · ${deck.name}`} — Tecla`
}

export const sameScreen = (a: Screen, b: Screen) =>
  formatHash({ screen: a, panel: null }) === formatHash({ screen: b, panel: null })
