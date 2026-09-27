import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Nombre accesible y tooltip: un botón con solo un icono necesita decir qué hace. */
  label: string
  size?: 'sm' | 'md'
  /** Color de fondo al pasar el cursor, según la superficie sobre la que está. */
  hover?: 'surface' | 'bg' | 'accent'
}

const hovers = {
  surface: 'hover:bg-surface hover:text-ink',
  bg: 'hover:bg-bg hover:text-ink',
  accent: 'hover:bg-accent-soft hover:text-accent',
}

/** Botón redondo con un icono. */
export function IconButton({
  label,
  size = 'sm',
  hover = 'surface',
  title,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        'grid shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-[color,background-color,opacity]',
        'focus-visible:outline-2 focus-visible:outline-accent',
        size === 'sm' ? 'size-9' : 'size-10',
        hovers[hover],
        className,
      )}
      {...props}
    />
  )
}
