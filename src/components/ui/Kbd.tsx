import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line-strong bg-raised px-1.5 font-sans text-[11px] font-semibold text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
