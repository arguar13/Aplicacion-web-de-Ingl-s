import { useMemo } from 'react'
import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { cn } from '@/lib/cn'
import { useSettings } from '@/lib/settings'
import { TOPICS, type TopicId } from '@/lib/topicMeta'
import { topicDeck } from '@/lib/topics'
import { type Mode, trackOf } from '@/lib/types'
import { Game } from './Game'
import { Header } from './Header'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import { ProgressBar } from './ProgressBar'

/** Colecciones temáticas: el vocabulario agrupado por tema, para practicar lo que más te interesa. */
export function TopicsScreen({ onExit, onOpen }: { onExit: () => void; onOpen: (topic: TopicId) => void }) {
  const { mode } = useSettings()
  const summaryOf = useDeckSummaries(trackOf(mode))
  const decks = useMemo(() => TOPICS.map((topic) => ({ topic: topic.id, deck: topicDeck(topic.id) })), [])

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-14 sm:px-6">
        <button
          type="button"
          onClick={onExit}
          className="-ml-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeftIcon width={16} height={16} />
          Inicio
        </button>
        <h1 className="mt-4 font-display text-5xl leading-none">Colecciones</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          El vocabulario por temas. Las opciones de cada ronda son del mismo tema: hay que saber la palabra exacta.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {decks.map(({ topic, deck }, index) => {
            const summary = summaryOf(deck)
            const started = summary.fresh < summary.total
            return (
              <li
                key={topic}
                className="animate-rise"
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
              >
                <button
                  type="button"
                  onClick={() => onOpen(topic)}
                  className={cn(
                    'group flex h-full w-full cursor-pointer flex-col rounded-3xl border border-line bg-surface p-5 text-left shadow-card',
                    'transition-[translate,scale,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-key-hover active:translate-y-0 active:scale-[0.99]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  )}
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[17px] font-semibold">{deck.name}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted">{deck.description}</span>
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition-transform group-hover:translate-x-0.5">
                      <ArrowRightIcon width={16} height={16} />
                    </span>
                  </span>
                  <span lang="en" className="mt-3 block truncate text-[15px] font-medium text-ink/70">
                    {deck.words
                      .slice(0, 5)
                      .map((word) => word.en)
                      .join(' · ')}
                  </span>
                  <span className="mt-auto w-full pt-4">
                    <ProgressBar summary={summary} />
                    <span className="mt-1.5 block text-[11px] text-muted tabular-nums">
                      {started
                        ? `${summary.mastered} de ${summary.total} dominadas`
                        : `${summary.total} palabras por descubrir`}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}

/** Practicar una colección: una partida con sus palabras, en el modo elegido en el inicio. */
export function TopicGame({
  topic,
  mode,
  onExit,
  onOpenSettings,
}: {
  topic: TopicId
  mode: Mode
  onExit: () => void
  onOpenSettings: () => void
}) {
  const deck = useMemo(() => topicDeck(topic), [topic])
  return <Game key={`${topic}:${mode}`} deck={deck} mode={mode} onExit={onExit} onOpenSettings={onOpenSettings} />
}
