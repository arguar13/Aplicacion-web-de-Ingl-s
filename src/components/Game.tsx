import { useKeyDown } from '@/hooks/useKeyDown'
import { useQuiz } from '@/hooks/useQuiz'
import type { Deck } from '@/lib/decks'
import { Header } from './Header'
import { ArrowLeftIcon } from './icons'
import { Kbd } from './Kbd'
import { Keypad } from './Keypad'
import { WordScreen } from './WordScreen'

export function Game({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const quiz = useQuiz(deck.words)
  const { round, answer, replay } = quiz

  useKeyDown((event) => {
    if (event.key === 'Escape') return onExit()
    if (event.key === ' ') {
      event.preventDefault()
      return replay()
    }
    const option = round.options[Number(event.key) - 1]
    if (option) answer(option.id)
  })

  return (
    <>
      <Header stats={quiz.stats} />

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 short:py-3">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl short:max-w-4xl">
          <div className="mb-4 flex items-center justify-between gap-3 short:mb-2">
            <button
              type="button"
              onClick={onExit}
              className="-ml-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ArrowLeftIcon width={16} height={16} />
              Niveles
            </button>
            <span className="truncate text-sm text-muted">
              {deck.level !== null && <span className="font-semibold text-accent">Nivel {deck.level} · </span>}
              {deck.name}
            </span>
          </div>

          <div className="flex flex-col gap-5 sm:gap-6 short:grid short:grid-cols-2 short:items-center short:gap-4">
            <WordScreen word={round.word} solved={quiz.solved} mistakes={quiz.wrong.length} onReplay={replay} />
            <Keypad
              options={round.options}
              answerId={round.word.id}
              wrong={quiz.wrong}
              solved={quiz.solved}
              onAnswer={answer}
            />
          </div>
        </div>
      </main>

      <footer className="hidden items-center justify-center gap-6 pb-6 text-xs text-muted pointer-fine:flex">
        <span className="flex items-center gap-2">
          <Kbd>1</Kbd>–<Kbd>4</Kbd> responder
        </span>
        <span className="flex items-center gap-2">
          <Kbd>Espacio</Kbd> escuchar
        </span>
        <span className="flex items-center gap-2">
          <Kbd>Esc</Kbd> niveles
        </span>
      </footer>
    </>
  )
}
