import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-accent-ink shadow-glow hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:scale-[0.98]',
  secondary:
    'border border-line bg-surface text-ink shadow-key hover:-translate-y-px hover:border-line-strong active:translate-y-0 active:scale-[0.98]',
  ghost: 'text-muted hover:bg-ink/5 hover:text-ink',
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
        'transition-[background-color,border-color,color,filter,translate,scale,box-shadow] duration-150',
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
