import { lazy, Suspense } from 'react'
import { Sheet } from './ui/Sheet'

const ShortcutsContent = lazy(() =>
  import('./ShortcutsContent').then((module) => ({ default: module.ShortcutsContent })),
)

/** Todos los atajos de teclado, en un panel que se abre con «?» desde cualquier pantalla. */
export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Atajos de teclado">
      {open && (
        <Suspense fallback={null}>
          <ShortcutsContent />
        </Suspense>
      )}
    </Sheet>
  )
}
