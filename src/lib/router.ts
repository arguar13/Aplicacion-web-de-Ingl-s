/**
 * Enrutador sobre el historial del navegador: el botón atrás (también el de Android con la app
 * instalada) recorre las pantallas de Tecla en vez de salir de la app.
 */
import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { formatHash, parseHash, type Route, sameScreen } from './routes'

/** Profundidad dentro de la app, guardada en cada entrada del historial. */
interface HistoryState {
  teclaDepth: number
}

const isHistoryState = (value: unknown): value is HistoryState =>
  typeof value === 'object' && value !== null && typeof (value as Partial<HistoryState>).teclaDepth === 'number'

const depth = () => (isHistoryState(history.state) ? history.state.teclaDepth : 0)

let current: Route = typeof window === 'undefined' ? parseHash('') : parseHash(location.hash)
/**
 * Ruta a la que se está yendo. Con View Transitions, `current` cambia de forma asíncrona (dentro
 * del callback de la transición); `target` cambia al instante para descartar avisos duplicados:
 * al ir atrás, el navegador dispara `popstate` y `hashchange` por la misma navegación.
 */
let target: Route = current
const listeners = new Set<() => void>()

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Aplica la ruta; los cambios de pantalla se animan con View Transitions donde existan. */
function commit(next: Route) {
  if (formatHash(next) === formatHash(target)) return
  const screenChanged = !sameScreen(next.screen, target.screen)
  target = next
  const update = () => {
    current = next
    for (const listener of listeners) listener()
    if (screenChanged) window.scrollTo({ top: 0 })
  }
  if (screenChanged && document.startViewTransition && !prefersReducedMotion()) {
    const transition = document.startViewTransition(() => flushSync(update))
    // Si otra navegación empieza antes de que acabe la animación, esta se salta (su `ready` se
    // rechaza con AbortError). Es el comportamiento esperado: el cambio de pantalla sí se aplica.
    transition.ready.catch(() => undefined)
  } else {
    update()
  }
}

const canonicalState = (): HistoryState => ({ teclaDepth: depth() })

if (typeof window !== 'undefined') {
  // La URL canónica sustituye a la escrita (p. ej. una ruta desconocida pasa a ser el inicio).
  history.replaceState(canonicalState(), '', formatHash(current))
  const sync = () => {
    const next = parseHash(location.hash)
    if (location.hash !== formatHash(next)) history.replaceState(canonicalState(), '', formatHash(next))
    commit(next)
  }
  window.addEventListener('popstate', sync)
  window.addEventListener('hashchange', sync)
}

export function navigate(next: Route, { replace = false }: { replace?: boolean } = {}) {
  if (replace) history.replaceState(canonicalState(), '', formatHash(next))
  else history.pushState({ teclaDepth: depth() + 1 } satisfies HistoryState, '', formatHash(next))
  commit(next)
}

/**
 * Vuelve atrás dentro de la app. Si se entró directamente por un enlace y no hay adonde volver,
 * sustituye la entrada actual por `fallback` en lugar de sacar al usuario de Tecla.
 */
export function goBack(fallback: Route) {
  if (depth() > 0) history.back()
  else navigate(fallback, { replace: true })
}

export const getRoute = () => current

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useRoute = () => useSyncExternalStore(subscribe, getRoute, getRoute)
