import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'accent' | 'accent-soft' | 'ok-soft' | 'bad-soft'

const tones: Record<BadgeTone, string> = {
  accent: 'bg-accent text-accent-ink',
  'accent-soft': 'bg-accent-soft text-accent',
  'ok-soft': 'bg-ok-soft text-ok',
  'bad-soft': 'bg-bad-soft text-bad',
}

/** Etiqueta pequeña en forma de pastilla. `caps` la escribe en versalitas, para rótulos cortos. */
export function Badge({
  tone,
  caps = false,
  className,
  children,
}: {
  tone: BadgeTone
  caps?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-semibold tabular-nums',
        caps ? 'text-[10px] tracking-wide uppercase' : 'text-[11px]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
