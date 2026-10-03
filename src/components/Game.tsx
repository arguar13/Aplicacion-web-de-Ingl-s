import { useEffect, useMemo, useState } from 'react'
import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { assessLearner, type Pace } from '@/lib/coach'
import { useEvents } from '@/lib/events'
import { useKeyDown } from '@/hooks/useKeyDown'
import { useNow } from '@/hooks/useNow'
import { useQuiz } from '@/hooks/useQuiz'
import { type Deck, nextLevel, wordNumber } from '@/lib/decks'
import { useWordDetails } from '@/lib/details'
import { addExtraNew, cardKey, EXTRA_NEW_STEP, newWordsLeft, todayStats, useProgress } from '@/lib/progress'
import { previewIntervals, SELF_RATINGS } from '@/lib/scheduler'
import { rememberPractice } from '@/lib/resume'
import { RETENTION, useSettings } from '@/lib/settings'
import { answerLanguage, isTypedMode, type Mode, trackOf } from '@/lib/types'
import { IconButton } from './ui/IconButton'
import { GoalStat, Header, Stat } from './Header'
import { ArrowLeftIcon, SettingsIcon, SparkIcon } from './icons'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'
import { Keypad } from './Keypad'
import { ProgressBar } from './ProgressBar'
import { WordScreen } from './WordScreen'
import { DetailCard } from './DetailCard'
import { FlashCard } from './FlashCard'
import { TypeAnswer } from './TypeAnswer'
import { SessionSummary } from './SessionSummary'

interface Props {
  deck: Deck
  mode: Mode
  /** Modo concentración: minutos de la sesión, con cuenta atrás. */
  focusMinutes?: number
  onExit: () => void
  onOpenSettings: () => void
  /** Pasar al nivel siguiente cuando ya se vieron todas las palabras de este. */
  onNextDeck?: (deck: Deck) => void
}

export function Game({ deck, mode, focusMinutes, onExit, onOpenSettings, onNextDeck }: Props) {
  const [endsAt] = useState(() => (focusMinutes ? Date.now() + focusMinutes * 60_000 : null))
  const quiz = useQuiz(deck, mode, { endsAt })
  const { round, stats, answer, submitTyped, reveal, rate, replay, expand, advance, resume, requestExit } = quiz
  const coach = deck.kind === 'coach'
  // El modo es de cada ronda (en la sesión inteligente cambia de una a otra).
  const roundMode = round.mode
  const summary = useDeckSummaries(trackOf(roundMode))(deck)
  const masteredPct = Math.round((summary.mastered / summary.total) * 100)
  const events = useEvents()
  const pace = coach ? assessLearner(events).pace : null
  const backLabel = coach ? 'Inicio' : deck.kind === 'topic' ? 'Colecciones' : 'Niveles'
  const details = useWordDetails(round.word.id)
  const progress = useProgress()
  const today = todayStats(progress)
  const { dailyGoal, intensity, newPerDay } = useSettings()
  const following = nextLevel(deck)
  // Sin cupo de nuevas, la partida repasa y afianza: se dice por qué y se ofrecen unas cuantas más.
  // Solo donde lo nuevo sale del recorrido (sesión, niveles, todas) y cuando la ronda no es nueva.
  const quotaSpent =
    (coach || deck.kind === 'level' || deck.kind === 'all') &&
    (round.reason === 'practice' || round.reason === 'learning') &&
    newWordsLeft(progress, newPerDay) === 0
  // Modo tarjetas: cuándo volvería la palabra con cada nota (al minuto: un minuto de más no cambia nada).
  const now = useNow()
  const flashCard = roundMode === 'flash' ? progress.cards[cardKey('en-es', round.word.id)] : undefined
  const intervals = useMemo(
    () => (roundMode === 'flash' ? previewIntervals(flashCard, now, RETENTION[intensity]) : null),
    [roundMode, flashCard, now, intensity],
  )
  const showDetail = quiz.solved && quiz.expanded

  // La práctica por tu cuenta queda anotada para «continuar donde lo dejaste».
  useEffect(() => {
    if (deck.kind === 'level' || deck.kind === 'all' || deck.kind === 'topic') rememberPractice(deck.id, mode)
  }, [deck, mode])
  const listenSlowly = () => replay({ slow: true })

  // Salir con palabras respondidas muestra antes el resumen de la sesión.
  const exit = () => {
    if (!requestExit()) onExit()
  }

  useKeyDown((event) => {
    const key = event.key.toLowerCase()
    if (quiz.summary) {
      // En el resumen, Enter lo hace el botón principal (tiene el foco); Esc sale.
      if (key === 'escape') onExit()
      return
    }
    if (key === 'escape') return exit()
    if (key === ' ') {
      event.preventDefault()
      return replay()
    }
    if (key === 'l') return listenSlowly()
    if (quiz.solved) {
      if (key === 'e') return expand()
      if (key === 'enter' || key === 'arrowright') advance()
      return
    }
    if (roundMode === 'flash') {
      if (!quiz.revealed) {
        if (key === 'enter') reveal()
        return
      }
      const rating = SELF_RATINGS[Number(event.key) - 1]
      if (rating) rate(rating)
      return
    }
    const option = round.options[Number(event.key) - 1]
    if (option) answer(option.id)
  })

  return (
    <>
      <Header>
        <Stat label="Racha" value={stats.streak} />
        <Stat label="Precisión" value={stats.solved ? `${Math.round((stats.firstTry / stats.solved) * 100)}%` : '—'} />
        <GoalStat done={today.answers} goal={dailyGoal} />
      </Header>

      {/* La barra de la partida queda bajo el encabezado; la palabra y el teclado, centrados en el
          espacio que sobra (en un teléfono alto, más cerca del pulgar). */}
      <main className="flex flex-1 flex-col items-center px-4 pt-3 pb-8 sm:px-6 sm:pt-6 sm:pb-12 short:py-3">
        <div className="flex w-full max-w-md flex-1 flex-col sm:max-w-lg md:max-w-xl short:max-w-4xl">
          <div className="mb-4 short:mb-2">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={quiz.summary ? onExit : exit}
                className="-ml-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ArrowLeftIcon width={16} height={16} />
                {backLabel}
              </button>
              <div className="flex min-w-0 items-center gap-1">
                <span className="truncate text-sm text-muted">
                  {deck.level !== null && <span className="font-semibold text-accent">Nivel {deck.level} · </span>}
                  {deck.name}
                </span>
                <IconButton label="Ajustes" onClick={onOpenSettings} className="-mr-2">
                  <SettingsIcon width={18} height={18} />
                </IconButton>
              </div>
            </div>
            {coach && pace && endsAt !== null && focusMinutes ? (
              <FocusBar endsAt={endsAt} minutes={focusMinutes} />
            ) : coach && pace ? (
              <CoachBar pace={pace} done={today.answers} goal={dailyGoal} />
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <ProgressBar summary={summary} className="flex-1" />
                <span className="text-xs text-muted tabular-nums">{masteredPct}% dominado</span>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-center">
            {quiz.summary ? (
              <SessionSummary
                reason={quiz.summary}
                stats={stats}
                dailyGoal={dailyGoal}
                deckLabel={deck.level === null ? deck.name : `Nivel ${deck.level} · ${deck.name}`}
                wordCount={deck.words.length}
                nextDeckLabel={following ? `Nivel ${following.level} · ${following.name}` : null}
                onNextDeck={following && onNextDeck ? () => onNextDeck(following) : undefined}
                onContinue={resume}
                onFinish={onExit}
              />
            ) : (
              <div className="flex flex-col gap-5 sm:gap-6 short:grid short:grid-cols-2 short:items-center short:gap-4">
                {quotaSpent && <QuotaNotice newPerDay={newPerDay} />}
                <WordScreen
                  word={round.word}
                  mode={roundMode}
                  reason={round.reason}
                  number={round.reason === 'new' && deck.kind !== 'topic' ? wordNumber(round.word.id) : null}
                  ipa={details?.ipa}
                  example={details === null ? null : details.example}
                  typed={quiz.typed}
                  revealed={quiz.revealed}
                  rating={quiz.rating}
                  solved={quiz.solved}
                  expanded={quiz.expanded}
                  mistakes={quiz.wrong.length}
                  canReplay={quiz.canReplay}
                  onReplay={() => replay()}
                  onListenSlowly={listenSlowly}
                  onExpand={expand}
                />
                {showDetail ? (
                  <DetailCard
                    key={round.word.id}
                    word={round.word}
                    mode={roundMode}
                    details={details}
                    onContinue={advance}
                    onListenSlowly={listenSlowly}
                  />
                ) : roundMode === 'flash' && intervals ? (
                  <FlashCard
                    key={round.word.id}
                    word={round.word}
                    revealed={quiz.revealed}
                    rating={quiz.rating}
                    intervals={intervals}
                    onReveal={reveal}
                    onRate={rate}
                  />
                ) : isTypedMode(roundMode) ? (
                  <TypeAnswer
                    key={round.word.id}
                    word={round.word}
                    mode={roundMode}
                    solved={quiz.solved}
                    typed={quiz.typed}
                    onSubmit={submitTyped}
                    onContinue={advance}
                  />
                ) : (
                  <Keypad
                    options={round.options}
                    language={answerLanguage(roundMode)}
                    answerId={round.word.id}
                    wrong={quiz.wrong}
                    solved={quiz.solved}
                    onAnswer={answer}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {!quiz.summary && (
        <footer className="hidden flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 pb-6 text-xs text-muted pointer-fine:flex">
          {quiz.solved ? (
            <span className="flex items-center gap-2">
              <Kbd>Enter</Kbd> continuar
            </span>
          ) : isTypedMode(roundMode) ? (
            <span className="flex items-center gap-2">
              <Kbd>Enter</Kbd> comprobar
            </span>
          ) : roundMode === 'flash' && !quiz.revealed ? (
            <span className="flex items-center gap-2">
              <Kbd>Enter</Kbd> mostrar
            </span>
          ) : roundMode === 'flash' ? (
            <span className="flex items-center gap-2">
              <Kbd>1</Kbd>–<Kbd>4</Kbd> calificar
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Kbd>1</Kbd>–<Kbd>4</Kbd> responder
            </span>
          )}
          {quiz.canReplay && (
            <>
              <span className="flex items-center gap-2">
                <Kbd>Espacio</Kbd> escuchar
              </span>
              <span className="flex items-center gap-2">
                <Kbd>L</Kbd> despacio
              </span>
            </>
          )}
          <span className="flex items-center gap-2">
            <Kbd>Esc</Kbd> {backLabel.toLowerCase()}
          </span>
        </footer>
      )}
    </>
  )
}

const PACE_INFO: Record<Pace, { label: string; hint: string }> = {
  steady: { label: 'Afianzando', hint: 'Menos palabras nuevas a la vez hasta que las de ahora se asienten.' },
  normal: { label: 'Ritmo normal', hint: 'Repasos y palabras nuevas en orden de frecuencia.' },
  fast: { label: 'Acelerando', hint: 'Vas muy bien: más palabras nuevas a la vez, y lo que ya sabías se aleja.' },
}

/**
 * Aviso de cupo cumplido: hoy ya se vieron las palabras nuevas del límite, así que la partida repasa
 * y afianza lo aprendido. Un toque suma unas cuantas más solo por hoy.
 */
function QuotaNotice({ newPerDay }: { newPerDay: number }) {
  return (
    <div
      role="status"
      className="flex animate-rise flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-accent/25 bg-accent-soft px-4 py-2.5 short:col-span-2"
    >
      <SparkIcon width={16} height={16} className="shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink">
        Ya viste tus {newPerDay} palabras nuevas de hoy: ahora afianzas lo aprendido.
      </p>
      <Button size="sm" variant="primary" onClick={() => addExtraNew()}>
        +{EXTRA_NEW_STEP} nuevas
      </Button>
    </div>
  )
}

/** Barra de la sesión inteligente: el ritmo que decidió el entrenador y el avance de la meta del día. */
function CoachBar({ pace, done, goal }: { pace: Pace; done: number; goal: number }) {
  const { label, hint } = PACE_INFO[pace]
  return (
    <div className="mt-2 flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Meta de hoy"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(done, goal)}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${Math.min(done / goal, 1) * 100}%` }}
        />
      </div>
      <span
        title={hint}
        className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent"
      >
        {label}
      </span>
    </div>
  )
}

/** Tiempo que queda (ms), actualizado cada segundo. */
function useRemaining(endsAt: number): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return Math.max(0, endsAt - now)
}

/** Barra del modo concentración: cuenta atrás. Al llegar a cero, la ronda en curso termina y sale el resumen. */
function FocusBar({ endsAt, minutes }: { endsAt: number; minutes: number }) {
  const remaining = useRemaining(endsAt)
  const total = minutes * 60_000
  const seconds = Math.ceil(remaining / 1000)
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <div className="mt-2 flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Tiempo de concentración"
        aria-valuemin={0}
        aria-valuemax={minutes * 60}
        aria-valuenow={minutes * 60 - seconds}
        aria-valuetext={`Quedan ${label}`}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear"
          style={{ width: `${(1 - remaining / total) * 100}%` }}
        />
      </div>
      <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent tabular-nums">
        {remaining > 0 ? label : 'Última'}
      </span>
    </div>
  )
}
