import { type RefObject, useEffect, useState } from 'react'

export interface VirtualRange {
  start: number
  end: number
}

/**
 * Qué filas de una lista larga están a la vista, según el desplazamiento de la ventana: solo se
 * pintan esas (y unas cuantas de margen), así miles de filas se desplazan con fluidez.
 */
export function useWindowVirtualizer(
  list: RefObject<HTMLElement | null>,
  count: number,
  rowHeight: number,
  overscan = 8,
): VirtualRange {
  const [range, setRange] = useState<VirtualRange>({ start: 0, end: Math.min(count, 30) })

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const top = list.current?.getBoundingClientRect().top ?? 0
      const first = Math.floor(-top / rowHeight)
      const visible = Math.ceil(window.innerHeight / rowHeight)
      const start = Math.max(0, first - overscan)
      const end = Math.min(count, Math.max(0, first) + visible + overscan)
      setRange((current) => (current.start === start && current.end === end ? current : { start, end }))
    }
    // Una medición por fotograma como mucho, aunque lleguen muchos eventos de scroll.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [list, count, rowHeight, overscan])

  return range
}
