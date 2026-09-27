import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: Array<{ value: T; label: ReactNode }>
  onChange: (value: T) => void
  className?: string
}

/** Grupo de opciones excluyentes con aspecto de pastilla. */
export function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-full border border-line bg-bg p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
              active ? 'bg-raised text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'absolute top-1 left-1 size-5 rounded-full bg-raised shadow-sm transition-transform duration-200',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

export function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-9 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink',
        'focus-visible:outline-2 focus-visible:outline-accent',
        className,
      )}
    >
      {children}
    </button>
  )
}
