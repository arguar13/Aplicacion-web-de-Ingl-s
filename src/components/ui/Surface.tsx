import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type SurfaceElement = 'div' | 'section' | 'aside' | 'article'

/** Tarjeta principal: papel elevado con esquinas amplias y sombra suave. */
export function Surface({
  as: Element = 'div',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: SurfaceElement }) {
  return (
    <Element
      className={cn(
        'rounded-[28px] border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_40px_-20px_rgb(0_0_0/0.18)]',
        className,
      )}
      {...props}
    />
  )
}
