import { useEffect, useRef } from 'react'

/** Escucha el teclado global ignorando repeticiones y combinaciones con modificadores. */
export function useKeyDown(handler: (event: KeyboardEvent) => void) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      latest.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
