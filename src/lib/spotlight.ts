/**
 * Luz que sigue al puntero en las tarjetas con la clase `spotlight` (ver index.css): un solo oyente
 * para toda la página fija `--mx` y `--my` en la tarjeta que está bajo el puntero. Solo con ratón o
 * trackpad; en pantallas táctiles no hay puntero que seguir.
 */
export function initSpotlight() {
  if (!window.matchMedia('(pointer: fine)').matches) return
  document.addEventListener(
    'pointermove',
    (event) => {
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('.spotlight') : null
      if (!card) return
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`)
      card.style.setProperty('--my', `${event.clientY - rect.top}px`)
    },
    { passive: true },
  )
}
