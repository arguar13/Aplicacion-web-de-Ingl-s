import { useEffect, useId, useRef } from 'react'
import type { QuizStats, SummaryReason } from '@/hooks/useQuiz'
import { feedback } from '@/lib/feedback'
import { formatCount, plural } from '@/lib/format'
import { Confetti } from './Confetti'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'
import { Surface } from './ui/Surface'

interface Props {
  reason: SummaryReason
  stats: QuizStats
  dailyGoal: number
  /** Nombre del mazo ("Nivel 3 · Cotidiano"), para celebrar un nivel completo. */
  deckLabel: string
  wordCount: number
  onContinue: () => void
  onFinish: () => void
}

/** Cuántas palabras falladas se muestran; el resto se resume en "y N más". */
const MISSED_SHOWN = 8

/** Resumen de la sesión: al cumplir la meta del día o al salir de la partida. */
export function SessionSummary({ reason, stats, dailyGoal, deckLabel, wordCount, onContinue, onFinish }: Props) {
  const titleId = useId()
  const primary = useRef<HTMLButtonElement>(null)
  // La meta, el nivel completo y el tiempo de concentración se celebran; salir es un resumen tranquilo.
  const goal = reason === 'goal' || reason === 'level' || reason === 'time'
  const accuracy = stats.solved ? Math.round((stats.firstTry / stats.solved) * 100) : 0
  const missed = stats.missed.slice(0, MISSED_SHOWN)
  const more = stats.missed.length - missed.length

  useEffect(() => {
    primary.current?.focus({ preventScroll: true })
    if (reason !== 'exit') feedback('goal')
  }, [reason])

  const tiles = [
    { label: 'Palabras', value: formatCount(stats.solved) },
    { label: 'Precisión', value: `${accuracy}%` },
    { label: 'Nuevas', value: formatCount(stats.fresh) },
    { label: 'Mejor racha', value: formatCount(stats.bestStreak) },
  ]

  return (
    <Surface as="section" aria-labelledby={titleId} className="animate-rise px-6 pt-8 pb-6 text-center sm:px-8">
      {goal && <Confetti pieces={reason === 'level' ? 180 : 110} />}
      {goal && <GoalBadge />}
      <h1 id={titleId} className="font-display text-4xl leading-tight sm:text-5xl">
        {reason === 'level'
          ? '¡Nivel completo!'
          : reason === 'goal'
            ? '¡Meta cumplida!'
            : reason === 'time'
              ? '¡Tiempo cumplido!'
              : 'Buen trabajo'}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
        {reason === 'level'
          ? `Dominas las ${plural(wordCount, 'palabra')} de ${deckLabel}. Un paso enorme.`
          : reason === 'goal'
            ? `Respondiste ${plural(dailyGoal, 'palabra')} hoy. Lo que aprendiste vuelve justo antes de que lo olvides.`
            : reason === 'time'
              ? 'Cinco minutos de concentración. Pocos minutos cada día son los que más rinden.'
              : 'Esto es lo que hiciste en esta sesión. Tu progreso ya está guardado.'}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-line bg-bg px-3 py-3">
            <dt className="text-[10px] font-medium tracking-[0.14em] text-muted uppercase">{tile.label}</dt>
            <dd className="mt-0.5 font-display text-3xl tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>

      {missed.length > 0 && (
        <div className="mt-6 text-left">
          <h2 className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">Para repasar</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missed.map((word) => (
              <li key={word.id} className="rounded-full border border-line bg-raised px-3 py-1 text-sm">
                <span lang="en" className="font-medium">
                  {word.en}
                </span>
                <span className="text-muted"> · </span>
                <span lang="es" className="text-muted">
                  {word.es}
                </span>
              </li>
            ))}
            {more > 0 && <li className="px-2 py-1 text-sm text-muted">y {formatCount(more)} más</li>}
          </ul>
          <p className="mt-2 text-xs text-muted">Volverán pronto: el repaso espaciado se encarga.</p>
        </div>
      )}

      <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center">
        {goal ? (
          <>
            <Button size="lg" onClick={onFinish}>
              Terminar por hoy
            </Button>
            <Button ref={primary} variant="primary" size="lg" onClick={onContinue}>
              Seguir practicando
              <Kbd tone="accent">Enter</Kbd>
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" onClick={onContinue}>
              Seguir practicando
            </Button>
            <Button ref={primary} variant="primary" size="lg" onClick={onFinish}>
              Volver a los niveles
              <Kbd tone="accent">Enter</Kbd>
            </Button>
          </>
        )}
      </div>
    </Surface>
  )
}

/** Anillo completo con un ✓, que aparece con un pequeño salto. */
function GoalBadge() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden className="mx-auto mb-4 animate-pop text-ok">
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.18" />
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" />
      <path
        d="m21 33 7.5 7.5L44 25"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
