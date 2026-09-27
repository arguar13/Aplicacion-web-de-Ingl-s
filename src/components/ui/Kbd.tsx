import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const TONES = {
  default: 'border-line-strong bg-raised text-muted',
  /** Sobre un fondo de acento (botones principales, tarjeta de continuar). */
  accent: 'border-accent-ink/25 bg-accent-ink/10 text-accent-ink',
}

const SIZES = { md: 'h-6 min-w-6', sm: 'h-5 min-w-5' }

/**
 * Atajo de teclado. Solo se muestra con un puntero fino (ratón o trackpad, y con ellos un teclado):
 * en una pantalla táctil sería una instrucción imposible de seguir. `className` es para colocarlo,
 * no para cambiar su aspecto: para eso están `tone` y `size`.
 */
export function Kbd({
  children,
  tone = 'default',
  size = 'md',
  className,
}: {
  children: ReactNode
  tone?: keyof typeof TONES
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <kbd
      className={cn(
        'hidden items-center justify-center rounded-md border px-1.5 font-sans text-[11px] font-semibold pointer-fine:inline-flex',
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {children}
    </kbd>
  )
}
