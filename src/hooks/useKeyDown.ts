import { useEffect, useRef } from 'react'

/**
 * Escucha el teclado global ignorando repeticiones, combinaciones con modificadores y las teclas
 * pulsadas dentro de un diálogo abierto (que gestiona su propio teclado).
 */
export function useKeyDown(handler: (event: KeyboardEvent) => void) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (document.querySelector('dialog[open]')) return
      latest.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
