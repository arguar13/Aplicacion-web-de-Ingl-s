/**
 * La bienvenida del primer uso, solo su aspecto. La usan la app (Onboarding) y la plantilla de
 * index.html, que la pinta antes de que llegue la app a quien entra por primera vez: el texto
 * aparece al instante aunque la conexión sea lenta, y un test comprueba que las dos sean idénticas.
 */
import { type ChangeEvent, type ReactNode, useRef, useState } from 'react'
import { type Backup, readBackupFile } from '@/lib/backup'
import { cn } from '@/lib/cn'
import { LogoMark } from './icons'
import { Button } from './ui/Button'
import { Surface } from './ui/Surface'

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
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg">
        <StepDots current={0} />
        <Panel still={still}>
          <LogoMark width={64} height={64} className="mx-auto -rotate-6" />
          <h1 className="mt-6 font-display text-5xl leading-[1.05]">
            Inglés, <span className="text-brand">tecla</span> a tecla
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            Escucha una palabra, piensa y pulsa su traducción. Tecla te la vuelve a preguntar justo antes de que la
            olvides: pocos minutos al día bastan.
          </p>
          <Actions>
            <Button variant="ghost" size="lg" onClick={onSkip} aria-disabled={inert || undefined}>
              Saltar
            </Button>
            <Button variant="primary" size="lg" onClick={onStart} aria-disabled={inert || undefined}>
              Empezar
            </Button>
          </Actions>
          <RestoreLink onBackup={onBackup} inert={inert} />
        </Panel>
      </div>
    </main>
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

/** Para quien ya usa Tecla en otro dispositivo: elegir su copia sin pasar por la bienvenida. */
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
    <div className="mt-6 border-t border-line pt-5 text-sm text-muted">
      ¿Ya usas Tecla en otro dispositivo?{' '}
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
          aria-label="Archivo de copia de Tecla"
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
  return <Surface className={cn(!still && 'animate-rise', 'px-6 py-10 text-center sm:px-10')}>{children}</Surface>
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
