import type { ReactNode } from 'react'
import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { cn } from '@/lib/cn'
import { useCourseLevel } from '@/lib/course'
import { type CourseLevelId, courseLevelInfo } from '@/lib/courseMeta'
import { ALL_DECK, type Deck, LEVELS } from '@/lib/decks'
import { relativeDay } from '@/lib/format'
import { type CourseRun, latestRun, type PracticeSpot, type RunTarget, useResume } from '@/lib/resume'
import { isTopicId, topicInfo } from '@/lib/topicMeta'
import { topicDeck } from '@/lib/topics'
import { type Mode, trackOf } from '@/lib/types'
import { cardBase } from './homeCards'
import { ArrowRightIcon, BoltIcon, GraduationIcon } from './icons'
import { MODE_INFO } from './modeInfo'
import { ProgressBar } from './ProgressBar'

interface Props {
  now: number
  onPractice: (deck: Deck, mode: Mode) => void
  onOpenLesson: (level: CourseLevelId, lesson: string) => void
  onOpenExam: (level: CourseLevelId) => void
  onOpenQuiz: (level: CourseLevelId | null) => void
}

/**
 * El mazo de una práctica guardada (`level-3`, `all`, `tema-comida`) y cómo se nombra; null si ya
 * no existe.
 */
function deckOf(id: string): { deck: Deck; name: string } | null {
  if (id === ALL_DECK.id) return { deck: ALL_DECK, name: ALL_DECK.name }
  const level = LEVELS.find((deck) => deck.id === id)
  if (level) return { deck: level, name: `Nivel ${level.level} · ${level.name}` }
  const topic = id.startsWith('tema-') ? id.slice('tema-'.length) : null
  return topic && isTopicId(topic) ? { deck: topicDeck(topic), name: `Colección: ${topicInfo(topic).name}` } : null
}

/**
 * «Continúa donde lo dejaste»: lo último que se hizo en el curso (con el ejercicio en que se quedó) y
 * la última práctica por tu cuenta (mazo y modo), a un toque. Lo más reciente, primero. Sin nada que
 * retomar, no se muestra.
 */
export function ResumeSection({ now, onPractice, onOpenLesson, onOpenExam, onOpenQuiz }: Props) {
  const resume = useResume()
  const run = latestRun(resume)
  const practice = resume.practice
  const saved = practice ? deckOf(practice.deck) : null
  if (!run && !(practice && saved)) return null

  const items: Array<{ key: string; at: number; node: ReactNode }> = []
  if (run) {
    const open = () => {
      const { target } = run
      if (target.kind === 'lesson') onOpenLesson(target.level, target.lesson)
      else if (target.kind === 'exam') onOpenExam(target.level)
      else onOpenQuiz(target.level)
    }
    items.push({
      key: 'curso',
      at: run.run.at,
      node: <CourseTile target={run.target} run={run.run} now={now} onOpen={open} />,
    })
  }
  if (practice && saved) {
    items.push({
      key: 'practica',
      at: practice.at,
      node: (
        <PracticeTile
          spot={practice}
          deck={saved.deck}
          name={saved.name}
          now={now}
          onOpen={() => onPractice(saved.deck, practice.mode)}
        />
      ),
    })
  }
  items.sort((a, b) => b.at - a.at)

  return (
    <section aria-labelledby="continua" className="mt-8">
      <h2 id="continua" className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">
        Continúa donde lo dejaste
      </h2>
      <ul className={cn('grid grid-cols-1 gap-3', items.length > 1 && 'md:grid-cols-2')}>
        {items.map((item) => (
          <li key={item.key} className="animate-rise">
            {item.node}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Tile({
  icon,
  kicker,
  title,
  detail,
  footer,
  onOpen,
}: {
  icon: ReactNode
  kicker: string
  title: string
  detail: string
  footer?: ReactNode
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        cardBase,
        'flex h-full items-center gap-4 border-line bg-surface p-4 shadow-card sm:p-5',
        'hover:border-accent/40 hover:shadow-key-hover',
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent transition-colors group-hover:bg-brand group-hover:text-accent-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{kicker}</span>
        <span className="mt-0.5 line-clamp-2 block text-[16px] leading-snug font-semibold">{title}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
        {footer}
      </span>
      <ArrowRightIcon className="shrink-0 text-muted transition-transform group-hover:translate-x-1" />
    </button>
  )
}

/** Lo que se estaba haciendo en el curso. El título de la lección llega con el contenido del nivel. */
function CourseTile({
  target,
  run,
  now,
  onOpen,
}: {
  target: RunTarget
  run: CourseRun
  now: number
  onOpen: () => void
}) {
  const levelId = target.level ?? 'a1'
  const state = useCourseLevel(levelId)
  const levelName = target.level ? courseLevelInfo(target.level).name : null
  const content = state.status === 'ready' ? state.level : null

  let title: string
  let total: number | null = null
  if (target.kind === 'lesson') {
    const index = content?.lessons.findIndex((lesson) => lesson.id === target.lesson) ?? -1
    const lesson = content?.lessons[index]
    title = lesson ? `Lección ${index + 1}: ${lesson.title}` : `Lección del nivel ${levelName}`
    total = lesson?.exercises.length ?? null
  } else if (target.kind === 'exam') {
    title = `Examen del nivel ${levelName}`
    total = content?.exam.length ?? null
  } else {
    title = levelName ? `Quiz ${levelName}` : 'Quiz mixto'
  }

  const where =
    run.step === 'read'
      ? 'Leyendo la teoría'
      : run.index === 0
        ? 'A punto de empezar los ejercicios'
        : total
          ? `Ejercicio ${run.index + 1} de ${total}`
          : `Ejercicio ${run.index + 1}`

  return (
    <Tile
      icon={target.kind === 'quiz' ? <BoltIcon /> : <GraduationIcon />}
      kicker={levelName ? `Curso · nivel ${levelName}` : 'Curso'}
      title={title}
      detail={`${where} · ${relativeDay(run.at, now)}`}
      footer={
        run.step === 'practice' && total ? (
          <span
            role="progressbar"
            aria-label="Avance de la tanda"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={run.index}
            className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-line"
          >
            <span className="bg-accent" style={{ width: `${(run.index / total) * 100}%` }} />
          </span>
        ) : null
      }
      onOpen={onOpen}
    />
  )
}

/** La última práctica por tu cuenta: mazo, modo y cómo va ese mazo en esa habilidad. */
function PracticeTile({
  spot,
  deck,
  name,
  now,
  onOpen,
}: {
  spot: PracticeSpot
  deck: Deck
  name: string
  now: number
  onOpen: () => void
}) {
  const { label, Icon } = MODE_INFO[spot.mode]
  const summary = useDeckSummaries(trackOf(spot.mode))(deck)
  const pending =
    summary.due > 0
      ? `${summary.due.toLocaleString('es')} por repasar`
      : summary.fresh > 0
        ? `${summary.fresh.toLocaleString('es')} por descubrir`
        : 'todo visto'
  return (
    <Tile
      icon={<Icon />}
      kicker={`Práctica · ${label.toLowerCase()}`}
      title={name}
      detail={`${pending} · ${relativeDay(spot.at, now)}`}
      footer={<ProgressBar summary={summary} className="mt-2" />}
      onOpen={onOpen}
    />
  )
}
