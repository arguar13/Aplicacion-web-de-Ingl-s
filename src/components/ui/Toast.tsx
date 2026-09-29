import type { ReactNode } from 'react'

/** Aviso flotante en la parte inferior, por encima de la zona segura del dispositivo. */
export function Toast({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm animate-rise items-center gap-2 rounded-2xl border border-line bg-raised py-3 pr-3 pl-4 text-sm shadow-float"
    >
      <span className="flex-1">{children}</span>
      {actions}
    </div>
  )
}
