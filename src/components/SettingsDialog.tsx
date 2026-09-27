import { lazy, Suspense } from 'react'
import { Sheet } from './ui/Sheet'

/** Ajustes pesa (copias, recordatorio, audio sin conexión): no se carga hasta que hace falta. */
export const loadSettingsContent = () => import('./SettingsContent')
const SettingsContent = lazy(() => loadSettingsContent().then((module) => ({ default: module.SettingsContent })))

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      {/* Solo montado mientras está abierto: cada apertura empieza sin confirmaciones ni vistas
          previas pendientes de la vez anterior. */}
      {open && (
        <Suspense fallback={null}>
          <SettingsContent />
        </Suspense>
      )}
    </Sheet>
  )
}
