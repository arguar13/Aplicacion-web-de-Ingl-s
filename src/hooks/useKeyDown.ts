import { useEffect, useRef } from 'react'

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(target.type)))

/** Controles que el navegador activa con Enter o Espacio cuando tienen el foco. */
const isActivatable = (target: EventTarget | null) =>
  target instanceof Element &&
  target.matches(
    'button, a[href], summary, select, input, [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="option"], [role="slider"]',
  )

/**
 * Escucha el teclado global ignorando repeticiones, combinaciones con modificadores, las teclas
 * pulsadas dentro de un diálogo abierto (que gestiona su propio teclado), lo que se escribe en
 * campos de texto y Enter o Espacio sobre un control con foco: esos son del control (quien navega
 * con Tab hasta "Ajustes" y pulsa Enter quiere abrir Ajustes, no el atajo de la pantalla).
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
      if ((event.key === 'Enter' || event.key === ' ') && isActivatable(event.target)) return
      latest.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
