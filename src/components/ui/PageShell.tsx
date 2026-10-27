import type { ReactNode } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { cn } from '@/lib/cn'
import { Header } from '../Header'
import { ArrowLeftIcon } from '../icons'

/** Enlace para volver a la pantalla anterior, arriba a la izquierda. */
export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
    >
      <ArrowLeftIcon width={16} height={16} />
      {label}
    </button>
  )
}

/**
 * Pantalla con cabecera y un «volver» (también con Esc). `wide` para las que muestran rejillas de
 * tarjetas (bibliotecas, planes); las de lectura, a una columna cómoda.
 */
export function PageShell({
  back,
  wide = false,
  children,
}: {
  back: { label: string; onClick: () => void }
  wide?: boolean
  children: ReactNode
}) {
  useKeyDown((event) => {
    if (event.key === 'Escape') back.onClick()
  })
  return (
    <>
      <Header wide={wide} />
      <main className={cn('mx-auto w-full flex-1 px-4 pt-6 pb-14 sm:px-6', wide ? 'max-w-6xl' : 'max-w-3xl')}>
        <BackLink label={back.label} onClick={back.onClick} />
        {children}
      </main>
    </>
  )
}
