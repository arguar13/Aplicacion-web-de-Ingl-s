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

export function SpeakerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}

export function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  )
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

export function ShuffleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
      <path d="m18 14 4 4-4 4" />
    </svg>
  )
}

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={30} height={30} viewBox="0 0 64 64" aria-hidden {...props}>
      <rect
        x="4"
        y="8"
        width="56"
        height="52"
        rx="14"
        style={{ fill: 'color-mix(in oklab, var(--accent) 70%, black)' }}
      />
      <rect x="4" y="4" width="56" height="50" rx="14" style={{ fill: 'var(--accent)' }} />
      <text
        x="32"
        y="40"
        fontFamily="Instrument Serif, Georgia, serif"
        fontSize="32"
        fontStyle="italic"
        textAnchor="middle"
        style={{ fill: 'var(--accent-ink)' }}
      >
        Aa
      </text>
    </svg>
  )
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  )
}

/** Tortuga: escuchar despacio. */
export function SlowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 16c0-4.4 3.1-8 7-8s7 3.6 7 8H3Z" />
      <path d="m7 12.5 3-2.5 3 2.5-3 3.5-3-3.5Z" />
      <path d="M17 13.5h2.2a2 2 0 1 0 0-4c-1.2 0-2 .8-2.4 1.8" />
      <path d="M6 16v2.5M14 16v2.5" />
    </svg>
  )
}

/** Traducir: de una palabra a otra. */
export function TranslateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h8M8 3v2M5.5 5c.8 3 2.7 5.3 5.5 6.5M10.5 5c-.8 3-2.7 5.3-5.5 6.5" />
      <path d="m13 20 3.5-8 3.5 8M14.2 17.5h4.6" />
    </svg>
  )
}

/** Inverso: ida y vuelta. */
export function ReverseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h14m-4-4 4 4-4 4" />
      <path d="M20 16H6m4 4-4-4 4-4" />
    </svg>
  )
}

/** Escuchar: auriculares. */
export function HeadphonesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="5" height="7" rx="2" />
      <rect x="16" y="14" width="5" height="7" rx="2" />
    </svg>
  )
}

/** Escribir: teclado. */
export function KeyboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
    </svg>
  )
}

/** Completar: una línea de texto con un hueco. */
export function ClozeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7h6M15 7h6M3 12h4M17 12h4M3 17h10" />
      <path d="M10 13.5h6" strokeDasharray="0" />
      <rect x="9.5" y="9" width="7" height="5" rx="1.5" />
    </svg>
  )
}

/** Relámpago. */
export function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2Z" />
    </svg>
  )
}
