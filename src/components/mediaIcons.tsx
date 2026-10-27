/**
 * Iconos de los textos y del plan de estudio. Van aparte de icons.tsx porque solo los usan pantallas
 * que se cargan al abrirlas: así no pesan en el paquete inicial.
 */
import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" fill="currentColor" />
    </svg>
  )
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" />
    </svg>
  )
}

export function PreviousIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 5v14" />
      <path d="M18 6.5v11a1 1 0 0 1-1.6.8L9 12.8a1 1 0 0 1 0-1.6l7.4-5.5a1 1 0 0 1 1.6.8Z" />
    </svg>
  )
}

export function NextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M18 5v14" />
      <path d="M6 6.5v11a1 1 0 0 0 1.6.8L15 12.8a1 1 0 0 0 0-1.6L7.6 5.7A1 1 0 0 0 6 6.5Z" />
    </svg>
  )
}

export function RepeatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7" />
      <path d="M20 4v4.7h-4.7" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3" />
      <path d="M4 20v-4.7h4.7" />
    </svg>
  )
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.5 16.5 0 0 1-3 3.8" />
      <path d="M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.3-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

/** Un camino con su meta: el plan de estudio. */
export function RouteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="18" r="2.2" />
      <path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />
      <path d="M18 3v6" />
      <path d="M18 3h3.5l-1 1.5 1 1.5H18" />
    </svg>
  )
}

export function CircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  )
}

export function TranslationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h8" />
      <path d="M8 3v2" />
      <path d="M5.5 5c.8 3 2.7 5.4 5.5 6.8" />
      <path d="M10.5 5c-.7 3.3-2.8 6-6 7.5" />
      <path d="m13 20 3.5-8 3.5 8" />
      <path d="M14.2 17.3h4.6" />
    </svg>
  )
}
