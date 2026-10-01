import { type SVGProps, useId } from 'react'

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

/**
 * Logo: una "T" geométrica con un punto (la tecla pulsada) sobre el degradado de marca. Cada
 * instancia necesita su propio id de degradado: el SVG puede aparecer varias veces en la página.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  const gradient = useId()
  return (
    <svg width={30} height={30} viewBox="0 0 64 64" aria-hidden {...props}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-2)' }} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${gradient})`} />
      <rect x="17" y="17" width="30" height="8" rx="4" style={{ fill: 'var(--accent-ink)' }} />
      <rect x="28" y="17" width="8" height="30" rx="4" style={{ fill: 'var(--accent-ink)' }} />
      <circle cx="45" cy="43" r="4" style={{ fill: 'var(--accent-ink)' }} opacity="0.75" />
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

/** Cronómetro: el modo concentración. */
export function TimerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2h6" />
    </svg>
  )
}

/** Micrófono: pronunciar con la voz. */
export function MicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  )
}

/** Capas: las colecciones temáticas. */
export function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  )
}

/** Destello: la sesión inteligente. */
export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  )
}

/** Estadísticas. */
export function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20h16" />
      <path d="M7 16v-5M12 16V6M17 16v-8" />
    </svg>
  )
}

/** Favorita. `filled` la rellena. */
export function StarIcon({ filled = false, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg {...base} {...props}>
      <path
        d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5Z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

/** Diccionario: un libro abierto. */
export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z" />
      <path d="M12 6.5v13" />
    </svg>
  )
}

/** Racha: una llama. */
export function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.8 3.4-5.6 4-9.5 2.3 1.4 3.7 3.6 4 5.8.9-.6 1.5-1.7 1.6-3 1.9 1.7 3.4 4 3.4 6.7 0 3.4-2.6 6-6.5 6Z" />
    </svg>
  )
}

/** Tarjetas: dos naipes superpuestos, el modo de autoevaluación. */
export function CardsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7" width="13" height="14" rx="2.5" />
      <path d="M8 4.5A2.5 2.5 0 0 1 10.5 3h8A2.5 2.5 0 0 1 21 5.5v10a2.5 2.5 0 0 1-2 2.45" />
      <path d="M7 12h5M7 16h3" />
    </svg>
  )
}

/** Dictado: ondas de sonido y un lápiz. */
export function DictationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v4M8 7v10M12 4v16M16 9v6" />
      <path d="m19.5 13.5 1.5 1.5-5 5h-1.5v-1.5l5-5Z" />
    </svg>
  )
}

/** Marca de verificación en un círculo: misión cumplida. */
export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.3 2.4 2.4 4.6-5" />
    </svg>
  )
}

/** Bandera: las misiones del día. */
export function FlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  )
}

/** Leer en voz alta: líneas de texto con ondas de sonido. */
export function ReadAloudIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h9M4 12h7M4 17h5" />
      <path d="M16.5 9.5a4 4 0 0 1 0 5M19.5 7a8 8 0 0 1 0 10" />
    </svg>
  )
}

/** Exportar: una hoja con una flecha hacia fuera. */
export function ExportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v11M8 8l4-4 4 4" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  )
}
