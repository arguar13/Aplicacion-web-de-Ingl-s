import type { SVGProps } from 'react'
import type { AchievementIcon } from '@/lib/achievements'
import { cn } from '@/lib/cn'

const GLYPHS: Record<AchievementIcon, (props: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  spark: (p) => (
    <svg {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  ),
  target: (p) => (
    <svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  ),
  flame: (p) => (
    <svg {...p}>
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.8 3.4-5.6 4-9.5 2.3 1.4 3.7 3.6 4 5.8.9-.6 1.5-1.7 1.6-3 1.9 1.7 3.4 4 3.4 6.7 0 3.4-2.6 6-6.5 6Z" />
    </svg>
  ),
  crown: (p) => (
    <svg {...p}>
      <path d="m4 8 4 4 4-6 4 6 4-4-1.5 10h-13L4 8Z" />
    </svg>
  ),
  layers: (p) => (
    <svg {...p}>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
    </svg>
  ),
  bolt: (p) => (
    <svg {...p}>
      <path d="M13 3 5 13.5h6.5L10.5 21 19 10.5h-6.5L13 3Z" />
    </svg>
  ),
  compass: (p) => (
    <svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  ),
  check: (p) => (
    <svg {...p}>
      <path d="m6 12.5 4 4 8-9" />
    </svg>
  ),
}

/** Medalla de un logro: acuñada en el acento si está desbloqueado, en relieve apagado si no. */
export function Medal({ icon, unlocked, size = 56 }: { icon: AchievementIcon; unlocked: boolean; size?: number }) {
  const Glyph = GLYPHS[icon]
  return (
    <span
      aria-hidden
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full',
        unlocked
          ? 'bg-accent text-accent-ink shadow-[inset_0_-3px_0_0_color-mix(in_oklab,var(--accent)_65%,black),0_6px_16px_-8px_var(--accent)]'
          : 'bg-line text-muted shadow-[inset_0_-3px_0_0_var(--line-strong)]',
      )}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          'absolute inset-[5px] rounded-full border',
          unlocked ? 'border-accent-ink/25' : 'border-dashed border-line-strong/70',
        )}
      />
      <Glyph
        width={size * 0.42}
        height={size * 0.42}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </span>
  )
}
