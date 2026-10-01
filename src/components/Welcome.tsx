/**
 * La bienvenida del primer uso, solo su aspecto. La usan la app (Onboarding) y la plantilla de
 * index.html, que la pinta antes de que llegue la app a quien entra por primera vez: el texto
 * aparece al instante aunque la conexión sea lenta, y un test comprueba que las dos sean idénticas.
 */
import { type ChangeEvent, type ReactNode, useRef, useState } from 'react'
import { playEffect, playPronunciation } from '@/lib/audio'
import { type Backup, readBackupFile } from '@/lib/backup'
import { cn } from '@/lib/cn'
import { Brand } from './Header'
import {
  ArrowRightIcon,
  BoltIcon,
  CheckCircleIcon,
  FlameIcon,
  GraduationIcon,
  HeadphonesIcon,
  SparkIcon,
  SpeakerIcon,
} from './icons'
import { Button } from './ui/Button'
import { Surface } from './ui/Surface'

/** Lo que trae la app, en cifras (un test comprueba que coincidan con los datos). */
export const SHOWCASE = { words: 8461, levels: 6, lessons: 74, topics: 19 } as const

interface WelcomeProps {
  onStart: () => void
  onSkip: () => void
  onBackup: (backup: Backup) => void
  /** Ya se ve (pintada desde el HTML): sin animación de entrada, que haría parpadear el texto. */
  still?: boolean
  /** Copia estática del HTML: los botones aún no responden (lo sabe el lector de pantalla y los tests). */
  inert?: boolean
}

export function WelcomeScreen({ onStart, onSkip, onBackup, still = false, inert = false }: WelcomeProps) {
  const enter = (delay: number) =>
    still ? undefined : { animationDelay: `${delay}ms`, animationFillMode: 'both' as const }
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-6 sm:pt-7 short:pt-3">
        <Brand />
        <span className="hidden items-center gap-2 rounded-full glass px-3.5 py-1.5 text-xs font-semibold text-muted shadow-key sm:inline-flex">
          <CheckCircleIcon width={14} height={14} className="text-ok" />
          Gratis, sin anuncios y sin conexión
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-4 pt-10 pb-12 sm:px-6 sm:pt-14 lg:grid-cols-[1.08fr_1fr] lg:gap-14 lg:pt-10 lg:pb-16 short:pt-3">
        <section className="text-center lg:text-left">
          <p
            className={cn(
              'inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-xs font-semibold text-accent shadow-key',
              !still && 'animate-rise',
            )}
            style={enter(0)}
          >
            <span className="relative grid size-2 place-items-center">
              <span className="absolute size-2 animate-pulse-soft rounded-full bg-accent/40" />
              <span className="size-1.5 rounded-full bg-accent" />
            </span>
            Curso completo de A1 a C2
          </p>
          <h1
            className={cn(
              'mx-auto mt-6 max-w-2xl font-display text-[2.75rem] leading-[1.02] text-balance sm:text-6xl lg:mx-0 xl:text-7xl short:mt-3 short:text-4xl',
              !still && 'animate-rise',
            )}
            style={enter(60)}
          >
            Habla inglés con <span className="text-brand">confianza</span>.
          </h1>
          <p
            className={cn(
              'mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-pretty text-muted lg:mx-0 short:mt-3 short:text-[15px]',
              !still && 'animate-rise',
            )}
            style={enter(120)}
          >
            {SHOWCASE.words.toLocaleString('es')} palabras con voz nativa, un curso con lecciones y exámenes, y un
            entrenador que te repasa cada palabra justo antes de que la olvides.
          </p>
          <div
            className={cn(
              'mt-9 flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start short:mt-5',
              !still && 'animate-rise',
            )}
            style={enter(180)}
          >
            <Button variant="secondary" size="xl" className="px-7" onClick={onSkip} aria-disabled={inert || undefined}>
              Explorar sin guía
            </Button>
            <Button
              variant="primary"
              size="xl"
              className="shine relative px-8 text-base"
              onClick={onStart}
              aria-disabled={inert || undefined}
            >
              Empezar gratis
              <ArrowRightIcon width={18} height={18} />
            </Button>
          </div>
          <RestoreLink onBackup={onBackup} inert={inert} />
        </section>

        <div
          className={cn('relative mx-auto w-full max-w-md lg:max-w-none', !still && 'animate-rise')}
          style={enter(220)}
        >
          <FloatingChips />
          <TryItCard inert={inert} />
        </div>
      </main>

      <Showcase />
      <Features />
    </div>
  )
}

/** Lo que pinta index.html para quien entra por primera vez (ver WelcomeScreen). */
const nothing = () => undefined

export function WelcomeShell() {
  return (
    <div className="flex min-h-dvh flex-col" data-arranque="">
      <div className="flex flex-1 flex-col">
        <WelcomeScreen onStart={nothing} onSkip={nothing} onBackup={nothing} still inert />
      </div>
    </div>
  )
}

/** Tres palabras para probar la mecánica de la app sin empezar todavía. */
const DEMO = [
  {
    id: 'beautiful',
    en: 'beautiful',
    ipa: '/ˈbjuːtɪfəl/',
    answer: 'hermoso',
    options: ['valiente', 'hermoso', 'rápido', 'tranquilo'],
  },
  { id: 'journey', en: 'journey', ipa: '/ˈdʒɜːrni/', answer: 'viaje', options: ['viaje', 'sueño', 'mundo', 'camino'] },
  { id: 'dream', en: 'dream', ipa: '/driːm/', answer: 'sueño', options: ['luz', 'fuerza', 'sueño', 'libre'] },
] as const

/**
 * «Pruébalo ahora»: la misma mecánica que la partida (escuchar, pensar, pulsar), con tres palabras.
 * En la copia estática del HTML los botones aún no responden.
 */
function TryItCard({ inert }: { inert: boolean }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const word = DEMO[index]
  const correct = picked === word.answer

  function pick(option: string) {
    if (inert || picked) return
    setPicked(option)
    playEffect(option === word.answer ? 'correct' : 'wrong')
  }

  function next() {
    setPicked(null)
    setIndex((i) => (i + 1) % DEMO.length)
  }

  return (
    <Surface className="ring-epic relative overflow-visible rounded-[2rem] p-6 shadow-float sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
          <SparkIcon width={14} height={14} className="text-accent" />
          Pruébalo ahora
        </span>
      </div>

      <div className="mt-7 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p lang="en" className="truncate font-display text-5xl leading-none sm:text-6xl">
            {word.en}
          </p>
          <p className="mt-3 font-mono text-sm text-muted">{word.ipa}</p>
        </div>
        <button
          type="button"
          aria-label={`Escuchar «${word.en}»`}
          aria-disabled={inert || undefined}
          onClick={() => !inert && void playPronunciation(word.id)}
          className="group grid size-14 shrink-0 cursor-pointer place-items-center rounded-full bg-brand text-accent-ink shadow-glow transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
        >
          <SpeakerIcon />
        </button>
      </div>

      <div role="group" aria-label="Elige la traducción" className="mt-7 grid grid-cols-2 gap-2.5">
        {word.options.map((option, i) => {
          const state =
            picked === null ? 'idle' : option === word.answer ? 'right' : option === picked ? 'wrong' : 'dim'
          return (
            <button
              key={option}
              type="button"
              aria-disabled={inert || undefined}
              onClick={() => pick(option)}
              className={cn(
                'flex h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 text-left text-[15px] font-semibold transition-[background-color,border-color,color,opacity,translate] duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                state === 'idle' && 'border-line bg-surface shadow-key hover:-translate-y-0.5 hover:border-accent/40',
                state === 'right' && 'animate-pop border-ok bg-ok-soft text-ok',
                state === 'wrong' && 'animate-shake border-bad bg-bad-soft text-bad',
                state === 'dim' && 'border-line bg-surface opacity-50',
              )}
            >
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-md border border-line-strong text-[11px] text-muted tabular-nums"
              >
                {i + 1}
              </span>
              {option}
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex min-h-10 items-center justify-between gap-3" aria-live="polite">
        <p className="text-sm text-muted">
          {picked === null
            ? 'Escucha, piensa y pulsa la traducción.'
            : correct
              ? '¡Exacto! Te la volveremos a preguntar justo a tiempo.'
              : `Casi: es «${word.answer}». Así se aprende.`}
        </p>
        {picked !== null && (
          <Button size="sm" onClick={next}>
            Otra
            <ArrowRightIcon width={14} height={14} />
          </Button>
        )}
      </div>
    </Surface>
  )
}

/** Tarjetas de vidrio que flotan alrededor de la demo: un vistazo a lo que se gana practicando. */
function FloatingChips() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
      <Chip className="-top-7 -left-10 lg:-left-14" delay={0}>
        <span className="grid size-8 place-items-center rounded-full bg-gold-soft text-gold">
          <FlameIcon width={16} height={16} />
        </span>
        <span>
          <span className="block text-[11px] text-muted">Racha</span>
          <span className="block text-sm font-semibold">12 días</span>
        </span>
      </Chip>
      <Chip className="-top-7 right-6 lg:-right-6" delay={1200}>
        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
          <GraduationIcon width={16} height={16} />
        </span>
        <span>
          <span className="block text-[11px] text-muted">Nivel</span>
          <span className="block text-sm font-semibold">B1 · Intermedio</span>
        </span>
      </Chip>
      <Chip className="-bottom-6 -left-6 lg:-left-10" delay={600}>
        <span className="grid size-8 place-items-center rounded-full bg-ok-soft text-ok">
          <BoltIcon width={16} height={16} />
        </span>
        <span>
          <span className="block text-[11px] text-muted">Misión cumplida</span>
          <span className="block text-sm font-semibold">+60 XP</span>
        </span>
      </Chip>
    </div>
  )
}

function Chip({ children, className, delay }: { children: ReactNode; className: string; delay: number }) {
  return (
    <div
      className={cn(
        'absolute z-10 flex animate-float items-center gap-2.5 rounded-2xl glass py-2 pr-4 pl-2 shadow-float',
        className,
      )}
      style={{ animationDelay: `-${delay}ms` }}
    >
      {children}
    </div>
  )
}

/** Las cifras de la app, en una franja de vidrio. */
function Showcase() {
  const items = [
    { value: SHOWCASE.words.toLocaleString('es'), label: 'palabras con voz nativa' },
    { value: 'A1–C2', label: `${SHOWCASE.levels} niveles del marco europeo` },
    { value: String(SHOWCASE.lessons), label: 'lecciones con ejercicios' },
    { value: String(SHOWCASE.topics), label: 'colecciones por temas' },
  ]
  return (
    <section aria-label="OpenSpeak en cifras" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl glass shadow-card lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-6 text-center sm:py-7">
            <dt className="sr-only">{item.label}</dt>
            <dd>
              <span className="block text-brand font-display text-3xl sm:text-4xl">{item.value}</span>
              <span className="mt-1.5 block text-xs text-muted sm:text-sm">{item.label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Tres razones, con el porqué de cada una. */
function Features() {
  const features = [
    {
      icon: <SparkIcon />,
      title: 'Un entrenador que decide por ti',
      text: 'Repaso espaciado (FSRS): cada palabra vuelve justo antes de que la olvides. Tú solo pulsas.',
    },
    {
      icon: <HeadphonesIcon />,
      title: 'Voz nativa y pronunciación',
      text: 'Cada palabra y cada frase con voz neuronal. Escúchala despacio y comprueba cómo la dices.',
    },
    {
      icon: <GraduationIcon />,
      title: 'Un curso de verdad',
      text: 'Lecciones, comprensión lectora y auditiva, quizzes y un examen por nivel, de A1 a C2.',
    },
  ]
  return (
    <section aria-label="Por qué OpenSpeak" className="mx-auto w-full max-w-6xl px-4 pt-6 pb-14 sm:px-6 sm:pb-20">
      <ul className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.title}>
            <Surface className="h-full spotlight p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                {feature.icon}
              </span>
              <h2 className="mt-5 text-[17px] font-semibold">{feature.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.text}</p>
            </Surface>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Para quien ya usa OpenSpeak en otro dispositivo: elegir su copia sin pasar por la bienvenida. */
function RestoreLink({ onBackup, inert = false }: { onBackup: (backup: Backup) => void; inert?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const parsed = await readBackupFile(file)
    if (parsed.ok) onBackup(parsed.backup)
    else setError(parsed.error)
  }

  return (
    <div className="mt-7 text-sm text-muted">
      ¿Ya usas OpenSpeak en otro dispositivo?{' '}
      <button
        type="button"
        aria-disabled={inert || undefined}
        onClick={() => input.current?.click()}
        className="cursor-pointer font-semibold text-accent underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Restaura tu copia
      </button>
      {/* La copia estática del HTML no lleva el selector: elegir un archivo antes de que llegue la
          app no haría nada. */}
      {!inert && (
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          onChange={(event) => void onFile(event)}
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo de copia de OpenSpeak"
        />
      )}
      {error && (
        <p role="alert" className="mt-3 font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  )
}

export function Panel({ children, still = false }: { children: ReactNode; still?: boolean }) {
  return (
    <Surface className={cn(!still && 'animate-rise', 'rounded-[2rem] px-6 py-10 text-center shadow-float sm:px-10')}>
      {children}
    </Surface>
  )
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex flex-col-reverse justify-center gap-2.5 sm:flex-row">{children}</div>
}

export function StepDots({ current }: { current: number }) {
  return (
    <ol aria-label={`Paso ${current + 1} de 3`} className="mb-5 flex justify-center gap-2">
      {['bienvenida', 'meta', 'nivel'].map((step, i) => (
        <li
          key={step}
          aria-hidden
          className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === current ? 'w-6 bg-accent' : 'w-1.5 bg-line-strong'}`}
        />
      ))}
    </ol>
  )
}
