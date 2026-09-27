import { type ComponentType, type SVGProps, useId } from 'react'
import { cn } from '@/lib/cn'
import type { Mode } from '@/lib/types'
import { ClozeIcon, HeadphonesIcon, KeyboardIcon, ReverseIcon, TranslateIcon } from './icons'

const MODE_INFO: Record<Mode, { label: string; hint: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  'en-es': { label: 'Traducir', hint: 'Inglés → español', Icon: TranslateIcon },
  'es-en': { label: 'Inverso', hint: 'Español → inglés', Icon: ReverseIcon },
  listen: { label: 'Escuchar', hint: 'Solo el audio', Icon: HeadphonesIcon },
  type: { label: 'Escribir', hint: 'Con el teclado', Icon: KeyboardIcon },
  cloze: { label: 'Completar', hint: 'En una frase', Icon: ClozeIcon },
}

const ORDER: readonly Mode[] = ['en-es', 'es-en', 'listen', 'type', 'cloze']

/**
 * Cómo practicar. Radios nativos: flechas para moverse, foco y anuncio a lectores de pantalla los
 * pone el navegador.
 */
export function ModePicker({
  value,
  onChange,
  className,
}: {
  value: Mode
  onChange: (mode: Mode) => void
  className?: string
}) {
  const name = useId()
  return (
    <fieldset className={cn('flex flex-wrap justify-center gap-2', className)}>
      <legend className="sr-only">Cómo practicar</legend>
      {ORDER.map((mode) => {
        const { label, hint, Icon } = MODE_INFO[mode]
        return (
          <label
            key={mode}
            className={cn(
              // Tres por fila en el móvil (la segunda, centrada) y las cinco en una fila desde sm.
              'group flex basis-[calc((100%-1rem)/3)] cursor-pointer flex-col items-center gap-1 rounded-2xl border border-line bg-surface/70 px-2 pt-3 pb-2.5 text-center sm:flex-1 sm:basis-0',
              'transition-[background-color,border-color,box-shadow,color] duration-200 hover:border-accent/40',
              'has-checked:border-accent has-checked:bg-raised has-checked:shadow-[0_2px_0_0_color-mix(in_oklab,var(--accent)_40%,var(--line))]',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
            )}
          >
            <input
              type="radio"
              name={name}
              value={mode}
              checked={mode === value}
              onChange={() => onChange(mode)}
              className="sr-only"
            />
            <Icon className="text-muted transition-colors group-has-checked:text-accent" />
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-[11px] leading-tight text-muted">{hint}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
