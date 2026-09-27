import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { useKeyDown } from '@/hooks/useKeyDown'
import { useQuiz } from '@/hooks/useQuiz'
import type { Deck } from '@/lib/decks'
import { useWordDetails } from '@/lib/details'
import { todayStats, useProgress } from '@/lib/progress'
import { useSettings } from '@/lib/settings'
import { answerLanguage, type Mode, trackOf } from '@/lib/types'
import { IconButton } from './ui/IconButton'
import { GoalStat, Header, Stat } from './Header'
import { ArrowLeftIcon, SettingsIcon } from './icons'
import { Kbd } from './ui/Kbd'
import { Keypad } from './Keypad'
import { ProgressBar } from './ProgressBar'
import { WordScreen } from './WordScreen'
import { DetailCard } from './DetailCard'
import { TypeAnswer } from './TypeAnswer'
import { SessionSummary } from './SessionSummary'

interface Props {
  deck: Deck
  mode: Mode
  onExit: () => void
  onOpenSettings: () => void
}

export function Game({ deck, mode, onExit, onOpenSettings }: Props) {
  const quiz = useQuiz(deck, mode)
  const { round, stats, answer, submitTyped, replay, expand, advance, resume, requestExit } = quiz
  const summary = useDeckSummaries(trackOf(mode))(deck)
  const masteredPct = Math.round((summary.mastered / summary.total) * 100)
  const details = useWordDetails(round.word.id)
  const today = todayStats(useProgress())
  const { dailyGoal } = useSettings()
  const showDetail = quiz.solved && quiz.expanded
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
                Niveles
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
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar summary={summary} className="flex-1" />
              <span className="text-xs text-muted tabular-nums">{masteredPct}% dominado</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            {quiz.summary ? (
              <SessionSummary
                reason={quiz.summary}
                stats={stats}
                dailyGoal={dailyGoal}
                deckLabel={deck.level === null ? deck.name : `Nivel ${deck.level} · ${deck.name}`}
                wordCount={deck.words.length}
                onContinue={resume}
                onFinish={onExit}
              />
            ) : (
              <div className="flex flex-col gap-5 sm:gap-6 short:grid short:grid-cols-2 short:items-center short:gap-4">
                <WordScreen
                  word={round.word}
                  mode={mode}
                  reason={round.reason}
                  ipa={details?.ipa}
                  example={details === null ? null : details.example}
                  typedVerdict={quiz.typed?.verdict}
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
                    mode={mode}
                    details={details}
                    onContinue={advance}
                    onListenSlowly={listenSlowly}
                  />
                ) : mode === 'type' ? (
                  <TypeAnswer
                    key={round.word.id}
                    word={round.word}
                    solved={quiz.solved}
                    typed={quiz.typed}
                    onSubmit={submitTyped}
                    onContinue={advance}
                  />
                ) : (
                  <Keypad
                    options={round.options}
                    language={answerLanguage(mode)}
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
          ) : mode === 'type' ? (
            <span className="flex items-center gap-2">
              <Kbd>Enter</Kbd> comprobar
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
            <Kbd>Esc</Kbd> niveles
          </span>
        </footer>
      )}
    </>
  )
}
