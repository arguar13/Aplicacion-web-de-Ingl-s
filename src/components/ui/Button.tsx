import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-[0_2px_0_0_color-mix(in_oklab,var(--accent)_65%,black)] hover:brightness-110 active:translate-y-px active:shadow-none',
  secondary: 'border border-line-strong text-ink hover:border-accent/50 hover:text-accent',
  ghost: 'text-muted hover:bg-bg hover:text-ink',
  danger: 'bg-bad text-white hover:brightness-110 focus-visible:outline-bad',
  'danger-outline': 'border border-bad/40 text-bad hover:bg-bad-soft focus-visible:outline-bad',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
  /** A la altura de un campo de texto grande (escribir la respuesta). */
  xl: 'h-14 px-6 text-[15px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  ref?: Ref<HTMLButtonElement>
}

/** Botón de acción con las variantes del sistema visual de Tecla. */
export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
        'transition-[background-color,border-color,color,filter,translate,box-shadow] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-default disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
