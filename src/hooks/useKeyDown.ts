import { useEffect, useRef } from 'react'

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(target.type)))

/**
 * Escucha el teclado global ignorando repeticiones, combinaciones con modificadores, las teclas
 * pulsadas dentro de un diálogo abierto (que gestiona su propio teclado) y lo que se escribe en
 * campos de texto.
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
      // Lo que se escribe en un campo de texto es texto, no atajos (salvo Esc, para poder salir).
      if (isEditable(event.target) && event.key !== 'Escape') return
      latest.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
