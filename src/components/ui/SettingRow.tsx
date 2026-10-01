import type { ReactNode } from 'react'

/** Fila de Ajustes: título, descripción y el control a la derecha. */
export function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{title}</p>
        <div className="mt-0.5 text-[13px] leading-snug text-muted">{description}</div>
      </div>
      {children}
    </div>
  )
}
