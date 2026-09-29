import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type SurfaceElement = 'div' | 'section' | 'aside' | 'article'

/** Tarjeta principal: papel elevado con esquinas amplias y sombra suave. */
export function Surface({
  as: Element = 'div',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: SurfaceElement }) {
  return <Element className={cn('rounded-3xl border border-line bg-surface shadow-card', className)} {...props} />
}
