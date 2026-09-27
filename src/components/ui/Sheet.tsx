import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react'
import { CloseIcon } from '../icons'
import { IconButton } from './IconButton'

interface SheetProps {
  open: boolean
  /** Se llama cuando el panel se cierra por cualquier vía: botón, Esc o tocar fuera. */
  onClose: () => void
  title: string
  /** Idioma del título si no es el de la página (la ficha de una palabra inglesa). */
  titleLang?: string
  children: ReactNode
}

/**
 * Panel modal: hoja que sube desde abajo en el móvil y ventana centrada en pantallas grandes.
 * Usa <dialog> nativo: foco atrapado, Esc y fondo inerte los pone el navegador.
 */
export function Sheet({ open, onClose, title, titleLang, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // El foco va al título: el lector de pantalla anuncia el panel y no aparece un anillo de foco
      // sobre el botón de cerrar, que el navegador enfocaría por ser el primer control.
      heading.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  useLightDismissFallback(ref)

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      closedby="any"
      aria-labelledby={titleId}
      className={[
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[28px] border border-line bg-surface p-0 text-ink',
        'shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.25)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px]',
        'open:animate-rise sm:m-auto sm:max-w-md sm:rounded-[28px]',
      ].join(' ')}
    >
      <div className="px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7 sm:pb-7">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 ref={heading} id={titleId} lang={titleLang} tabIndex={-1} className="font-display text-3xl outline-none">
            {title}
          </h2>
          <IconButton label="Cerrar" size="md" hover="bg" onClick={() => ref.current?.close()} className="-mr-2">
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  )
}

/**
 * `closedby="any"` cierra el diálogo al tocar fuera. En los navegadores que aún no lo soportan, se
 * replica: un toque sobre el propio <dialog> (y no sobre su contenido) es un toque en el fondo.
 */
function useLightDismissFallback(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close()
    }
    dialog.addEventListener('click', onClick)
    return () => dialog.removeEventListener('click', onClick)
  }, [ref])
}
