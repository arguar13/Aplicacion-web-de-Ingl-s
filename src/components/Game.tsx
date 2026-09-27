import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { useKeyDown } from '@/hooks/useKeyDown'
import { useQuiz } from '@/hooks/useQuiz'
import type { Deck } from '@/lib/decks'
import { useWordDetails } from '@/lib/details'
import type { Direction } from '@/lib/types'
import { IconButton } from './ui/IconButton'
import { Header, Stat } from './Header'
import { ArrowLeftIcon, SettingsIcon } from './icons'
import { Kbd } from './ui/Kbd'
import { Keypad } from './Keypad'
import { ProgressBar } from './ProgressBar'
import { WordScreen } from './WordScreen'
import { DetailCard } from './DetailCard'

interface Props {
  deck: Deck
  direction: Direction
  onExit: () => void
  onOpenSettings: () => void
}

export function Game({ deck, direction, onExit, onOpenSettings }: Props) {
  const quiz = useQuiz(deck, direction)
  const { round, stats, answer, replay, expand, advance } = quiz
  const summary = useDeckSummaries(direction)(deck)
  const masteredPct = Math.round((summary.mastered / summary.total) * 100)
  const details = useWordDetails(round.word.id)
  const showDetail = quiz.solved && quiz.expanded
  const listenSlowly = () => replay({ slow: true })

  useKeyDown((event) => {
    const key = event.key.toLowerCase()
    if (key === 'escape') return onExit()
    if (key === ' ') {
      event.preventDefault()
      return replay()
    }
    if (key === 'l') return listenSlowly()
    if (quiz.solved) {
      if (key === 'e') return expand()
      if (key === 'enter' || key === 'arrowright') {
        // Enter sobre el botón enfocado ya lo pulsa el navegador: no avanzar dos veces.
        event.preventDefault()
        return advance()
      }
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
        <Stat label="Palabras" value={stats.solved} />
      </Header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 short:py-3">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl short:max-w-4xl">
          <div className="mb-4 short:mb-2">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onExit}
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

          <div className="flex flex-col gap-5 sm:gap-6 short:grid short:grid-cols-2 short:items-center short:gap-4">
            <WordScreen
              word={round.word}
              direction={direction}
              reason={round.reason}
              ipa={details?.ipa}
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
                direction={direction}
                details={details}
                onContinue={advance}
                onListenSlowly={listenSlowly}
              />
            ) : (
              <Keypad
                options={round.options}
                direction={direction}
                answerId={round.word.id}
                wrong={quiz.wrong}
                solved={quiz.solved}
                onAnswer={answer}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="hidden flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 pb-6 text-xs text-muted pointer-fine:flex">
        {quiz.solved ? (
          <span className="flex items-center gap-2">
            <Kbd>Enter</Kbd> seguir
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
    </>
  )
}
