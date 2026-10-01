import { lazy, Suspense, useId, useState } from 'react'
import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { useKeyDown } from '@/hooks/useKeyDown'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'
import { ALL_DECK, type Deck, LEVELS, samplePreview } from '@/lib/decks'
import { formatCount, plural } from '@/lib/format'
import { currentStreak, todayStats, useProgress } from '@/lib/progress'
import type { CourseLevelId } from '@/lib/courseMeta'
import type { DeckSummary } from '@/lib/scheduler'
import { updateSettings, useSettings } from '@/lib/settings'
import { dueToday, forecast, hardWords, type SmartDeckKind } from '@/lib/smartDecks'
import { trackOf } from '@/lib/types'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { BackupReminder } from './BackupReminder'
import { CoachCard } from './CoachCard'
/** El curso trae su cargador y su progreso: fuera del paquete inicial, llega un instante después. */
const CourseCard = lazy(() => import('./CourseCard').then((module) => ({ default: module.CourseCard })))
import { MissionsCard } from './MissionsCard'
import { WordOfDayCard } from './WordOfDayCard'
import { StreakBanner } from './StreakBanner'
import { ForecastChart } from './ForecastChart'
import { ModePicker } from './ModePicker'
import { GoalStat, Header, Stat } from './Header'
import {
  ArrowRightIcon,
  BoltIcon,
  BookIcon,
  ChartIcon,
  LayersIcon,
  SettingsIcon,
  ShuffleIcon,
  StarIcon,
  TimerIcon,
} from './icons'
import { Kbd } from './ui/Kbd'
import { ProgressBar } from './ProgressBar'

const DECKS = [...LEVELS, ALL_DECK]
/** Niveles que se ven de entrada en el inicio. */
const LEVELS_SHOWN = 6

/** Tecla para elegir cada mazo: 1–9 para los niveles, 0 para todas las palabras. */
const shortcutOf = (deck: Deck) => (deck.level === null ? '0' : deck.level <= 9 ? String(deck.level) : null)

interface Props {
  onStartCoach: () => void
  onStartFocus: () => void
  onPick: (deck: Deck) => void
  onOpenSmart: (kind: SmartDeckKind) => void
  onOpenBlitz: () => void
  onOpenTopics: () => void
  onOpenCourse: () => void
  onOpenLesson: (level: CourseLevelId, lesson: string) => void
  onOpenExam: (level: CourseLevelId) => void
  onOpenStats: () => void
  onOpenDictionary: () => void
  onOpenSettings: () => void
  onOpenShortcuts: () => void
  onOpenWord: (id: string) => void
}

export function DeckPicker({
  onStartCoach,
  onStartFocus,
  onPick,
  onOpenSmart,
  onOpenBlitz,
  onOpenTopics,
  onOpenCourse,
  onOpenLesson,
  onOpenExam,
  onOpenStats,
  onOpenDictionary,
  onOpenSettings,
  onOpenShortcuts,
  onOpenWord,
}: Props) {
  const progress = useProgress()
  const { mode, dailyGoal } = useSettings()
  const track = trackOf(mode)
  const now = useNow()
  const summaryOf = useDeckSummaries(track)
  const total = summaryOf(ALL_DECK)
  const suggested = DECKS.find((d) => d.id === progress.lastDeckId) ?? LEVELS[0]
  const hasProgress = total.fresh < total.total
  const anyProgress = Object.keys(progress.cards).length > 0

  // Los primeros niveles y el que se está practicando; el resto, a un toque (son 17).
  const [showAllLevels, setShowAllLevels] = useState(false)
  const levelsId = useId()
  const visibleLevels = showAllLevels
    ? LEVELS
    : LEVELS.filter((deck, index) => index < LEVELS_SHOWN || deck.id === suggested.id)

  const due = anyProgress ? dueToday(progress, track, now).length : 0
  const hard = anyProgress ? hardWords(progress, track).length : 0
  const favorites = progress.favorites.length

  useKeyDown((event) => {
    if (event.key === 'Enter') return onStartCoach()
    const key = event.key.toLowerCase()
    if (key === 'r' && due > 0) return onOpenSmart('review')
    if (key === 'd' && hard > 0) return onOpenSmart('hard')
    if (key === 'f' && favorites > 0) return onOpenSmart('favorites')
    const deck = DECKS.find((d) => shortcutOf(d) === event.key)
    if (deck) onPick(deck)
  })

  return (
    <>
      <Header
        action={
          <span className="-mr-2 flex items-center">
            <IconButton label="Diccionario" onClick={onOpenDictionary}>
              <BookIcon />
            </IconButton>
            <IconButton label="Tu progreso" onClick={onOpenStats}>
              <ChartIcon />
            </IconButton>
            <IconButton label="Ajustes" onClick={onOpenSettings}>
              <SettingsIcon />
            </IconButton>
          </span>
        }
      >
        {anyProgress && (
          <>
            {/* En pantallas estrechas solo cabe la meta de hoy; el resto está en "Tu progreso". */}
            <Stat label="Días" value={currentStreak(progress, now)} className="max-[27.5rem]:hidden" />
            <Stat label="Dominadas" value={total.mastered.toLocaleString('es')} className="max-[27.5rem]:hidden" />
            <GoalStat done={todayStats(progress, now).answers} goal={dailyGoal} />
          </>
        )}
      </Header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="animate-rise text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Vocabulario en inglés</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-6xl">
            Escucha, <span className="text-brand">piensa</span>, pulsa.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            {total.total.toLocaleString('es')} palabras, de las más usadas a las más difíciles. Tecla decide qué
            practicar y te lo vuelve a preguntar justo antes de que lo olvides.
          </p>
        </div>

        <CoachCard now={now} onStart={onStartCoach} />
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={onStartFocus}>
            <TimerIcon width={16} height={16} />
            Modo concentración · 5 min
          </Button>
        </div>
        <StreakBanner progress={progress} now={now} />
        <BackupReminder onOpenSettings={onOpenSettings} />
        <MissionsCard now={now} />
        <Suspense
          fallback={<div className="mt-4 min-h-44 rounded-3xl border border-line bg-surface shadow-card" aria-hidden />}
        >
          <CourseCard onOpenCourse={onOpenCourse} onOpenLesson={onOpenLesson} onOpenExam={onOpenExam} />
        </Suspense>
        {anyProgress && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <ReviewCard
              due={due}
              forecast={forecast(progress, track, now)}
              now={now}
              onOpen={() => onOpenSmart('review')}
            />
            <HardCard count={hard} onOpen={() => onOpenSmart('hard')} />
            <FavoritesCard count={favorites} onOpen={() => onOpenSmart('favorites')} />
            <BlitzCard best={progress.blitzBest} onOpen={onOpenBlitz} />
          </div>
        )}
        <WordOfDayCard now={now} onOpenWord={onOpenWord} />
        <TopicsCard onOpen={onOpenTopics} />

        <section aria-labelledby="por-tu-cuenta" className="mt-12 sm:mt-14">
          <h2 id="por-tu-cuenta" className="font-display text-2xl">
            Practica por tu cuenta
          </h2>
          <p className="mt-1 text-sm text-muted">Elige cómo practicar y por dónde: un nivel o todas las palabras.</p>
          <ModePicker value={mode} onChange={(next) => updateSettings({ mode: next })} className="mt-5" />
          <ContinueCard deck={suggested} summary={summaryOf(suggested)} resuming={hasProgress} onPick={onPick} />
        </section>

        <h2 className="mt-10 mb-4 text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Todos los niveles</h2>
        <ul id={levelsId} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {visibleLevels.map((deck, index) => (
            <li
              key={deck.id}
              className="animate-rise"
              style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
            >
              <LevelCard deck={deck} summary={summaryOf(deck)} onPick={onPick} />
            </li>
          ))}
          <li
            className="animate-rise sm:col-span-2"
            style={{ animationDelay: `${visibleLevels.length * 40}ms`, animationFillMode: 'both' }}
          >
            <AllWordsCard summary={total} onPick={onPick} />
          </li>
        </ul>
        {!showAllLevels && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setShowAllLevels(true)} aria-controls={levelsId} aria-expanded={false}>
              Ver los {LEVELS.length} niveles
            </Button>
          </div>
        )}
        {/* Solo con teclado tiene sentido; en una pantalla táctil no se muestra. */}
        <div className="mt-10 hidden justify-center pointer-fine:flex">
          <Button variant="ghost" size="sm" onClick={onOpenShortcuts} aria-keyshortcuts="?">
            Atajos de teclado
            <Kbd>?</Kbd>
          </Button>
        </div>
      </main>
    </>
  )
}

const cardBase = cn(
  'group relative w-full cursor-pointer rounded-3xl border text-left',
  'transition-[translate,scale,box-shadow,border-color] duration-200',
  'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
)

/** Repaso del día: cuántas palabras tocan hoy en todos los niveles y la previsión de la semana. */
function ReviewCard({
  due,
  forecast: counts,
  now,
  onOpen,
}: {
  due: number
  forecast: number[]
  now: number
  onOpen: () => void
}) {
  const upcoming = counts.slice(1).reduce((sum, n) => sum + n, 0)
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={due === 0}
      aria-keyshortcuts={due > 0 ? 'R' : undefined}
      className={cn(
        cardBase,
        'flex h-full flex-col border-line bg-surface p-5 shadow-card',
        'hover:border-accent/40 hover:shadow-key-hover',
        'disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-line disabled:hover:shadow-card',
      )}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span>
          <span className="block text-[17px] font-semibold">Repaso del día</span>
          <span className="mt-0.5 block text-sm text-muted">
            {due > 0 ? `${plural(due, 'palabra')} te ${due === 1 ? 'espera' : 'esperan'} hoy` : 'Todo al día'}
          </span>
        </span>
        {due > 0 && <Kbd>R</Kbd>}
      </span>
      <ForecastChart counts={counts} now={now} className="mt-5 w-full" />
      <span className="mt-2 block text-[11px] text-muted">
        {upcoming > 0 ? `${plural(upcoming, 'repaso')} en los próximos 6 días` : 'Sin repasos en los próximos días'}
      </span>
    </button>
  )
}

/** Mis difíciles: las palabras que más se olvidan, para practicarlas aparte. */
function HardCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={count === 0}
      aria-keyshortcuts={count > 0 ? 'D' : undefined}
      className={cn(
        cardBase,
        'flex h-full flex-col border-line bg-surface p-5 shadow-card',
        'hover:border-bad/40 hover:shadow-[0_14px_30px_-14px_color-mix(in_oklab,var(--bad)_45%,transparent)]',
        'disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-line disabled:hover:shadow-card',
      )}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span>
          <span className="block text-[17px] font-semibold">Mis difíciles</span>
          <span className="mt-0.5 block text-sm text-muted">
            {count > 0 ? 'Las que más se te olvidan' : 'Por ahora, ninguna'}
          </span>
        </span>
        {count > 0 && <Kbd>D</Kbd>}
      </span>
      <span className="mt-auto pt-5">
        <span
          className={cn('block font-display text-5xl leading-none tabular-nums', count > 0 ? 'text-bad' : 'text-muted')}
        >
          {formatCount(count)}
        </span>
        <span className="mt-2 block text-[11px] text-muted">
          {count > 0
            ? 'Olvidadas dos veces o más, o de dificultad alta'
            : 'Aparecerán aquí las que olvides más de una vez'}
        </span>
      </span>
    </button>
  )
}

/** Favoritas: las palabras marcadas con la estrella, para practicarlas juntas. */
function FavoritesCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={count === 0}
      aria-keyshortcuts={count > 0 ? 'F' : undefined}
      className={cn(
        cardBase,
        'flex items-center gap-4 border-line bg-surface p-5 shadow-card',
        'hover:border-accent/40 hover:shadow-key-hover',
        'disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-line disabled:hover:shadow-card',
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full transition-transform group-hover:-rotate-12',
          count > 0 ? 'bg-accent-soft text-accent' : 'bg-bg text-muted',
        )}
      >
        <StarIcon filled={count > 0} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">Favoritas</span>
        <span className="block text-sm text-muted">
          {count > 0 ? `${plural(count, 'palabra')} con estrella` : 'Márcalas desde la ficha de cada palabra'}
        </span>
      </span>
      {count > 0 && <Kbd>F</Kbd>}
    </button>
  )
}

/** Acceso a las colecciones temáticas (comida, animales, viajes…). */
function TopicsCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        cardBase,
        'mt-4 flex items-center gap-4 border-line bg-surface p-5 shadow-card',
        'hover:border-accent/40 hover:shadow-key-hover',
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition-transform group-hover:-rotate-6">
        <LayersIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">Colecciones</span>
        <span className="block text-sm text-muted">Practica por temas: comida, viajes, emociones y más</span>
      </span>
      <ArrowRightIcon className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

function BlitzCard({ best, onOpen }: { best: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        cardBase,
        'flex items-center gap-4 border-line bg-surface p-5 shadow-card',
        'hover:border-accent/40 hover:shadow-key-hover',
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition-transform group-hover:rotate-12">
        <BoltIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">Relámpago</span>
        <span className="block text-sm text-muted">60 segundos, todas las que puedas</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[10px] font-medium tracking-[0.14em] text-muted uppercase">Récord</span>
        <span className="block font-display text-3xl leading-none tabular-nums">{formatCount(best)}</span>
      </span>
    </button>
  )
}

function DueBadge({ count }: { count: number }) {
  if (count === 0) return null
  return <Badge tone="accent">{count.toLocaleString('es')} por repasar</Badge>
}

function deckLabel(deck: Deck) {
  return deck.level === null ? deck.name : `Nivel ${deck.level} · ${deck.name}`
}

function ContinueCard({
  deck,
  summary,
  resuming,
  onPick,
}: {
  deck: Deck
  summary: DeckSummary
  resuming: boolean
  onPick: (deck: Deck) => void
}) {
  const detail = !resuming
    ? `Tus primeras ${summary.total} palabras, las más usadas del inglés.`
    : summary.due > 0
      ? `${summary.due.toLocaleString('es')} palabras esperan repaso.`
      : summary.fresh > 0
        ? `${summary.fresh.toLocaleString('es')} palabras nuevas por descubrir.`
        : 'Todo al día. Practica para afianzar.'

  return (
    <button
      type="button"
      onClick={() => onPick(deck)}
      className={cn(
        cardBase,
        'mt-5 flex items-center gap-4 border-line bg-surface p-5 shadow-card sm:gap-5',
        'hover:border-accent/40 hover:shadow-key-hover',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
          {resuming ? 'Continuar' : 'Empieza por un nivel'}
        </span>
        <span className="mt-1 block font-display text-2xl leading-tight">{deckLabel(deck)}</span>
        <span className="mt-0.5 block text-sm text-muted">{detail}</span>
        {resuming && (
          <span className="mt-3 flex items-center gap-3">
            <ProgressBar summary={summary} className="flex-1" />
            <span className="text-xs font-medium text-muted tabular-nums">
              {Math.round((summary.mastered / summary.total) * 100)}%
            </span>
          </span>
        )}
      </span>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-accent-ink transition-transform group-hover:translate-x-0.5">
        <ArrowRightIcon />
      </span>
    </button>
  )
}

function LevelCard({ deck, summary, onPick }: { deck: Deck; summary: DeckSummary; onPick: (deck: Deck) => void }) {
  const shortcut = shortcutOf(deck)
  const started = summary.fresh < summary.total
  const details = useId()
  return (
    // Nombre corto y preciso ("Nivel 13, Erudito"); el resto de la tarjeta queda como descripción.
    // Sin esto, el nombre sería todo su texto ("…sin diccionario") y chocaría con otros botones.
    <button
      type="button"
      onClick={() => onPick(deck)}
      aria-label={`Nivel ${deck.level}, ${deck.name}`}
      aria-describedby={details}
      aria-keyshortcuts={shortcut ?? undefined}
      className={cn(
        cardBase,
        'flex h-full gap-4 border-line bg-surface p-5 shadow-card',
        'hover:border-accent/40 hover:shadow-key-hover',
      )}
    >
      <span className="w-9 shrink-0 text-brand font-display text-5xl leading-[0.9] tabular-nums">{deck.level}</span>
      <span id={details} className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-8">
          <span className="text-[17px] font-semibold">{deck.name}</span>
          <DueBadge count={summary.due} />
        </span>
        <span className="block text-xs text-muted tabular-nums">
          Palabras {deck.from.toLocaleString('es')}–{deck.to.toLocaleString('es')}
        </span>
        <span className="mt-2 hidden text-sm leading-snug text-muted sm:block">{deck.description}</span>
        <span lang="en" className="mt-2 block truncate text-[15px] font-medium text-ink/70 sm:mt-3">
          {samplePreview(deck)
            .map((w) => w.en)
            .join(' · ')}
        </span>
        <span className="mt-auto pt-3">
          <ProgressBar summary={summary} />
          <span className="mt-1.5 block text-[11px] text-muted tabular-nums">
            {started
              ? `${summary.mastered} dominadas · ${summary.learning} aprendiendo`
              : `${summary.total} palabras por descubrir`}
          </span>
        </span>
      </span>
      {shortcut && <Kbd className="absolute top-4 right-4">{shortcut}</Kbd>}
    </button>
  )
}

function AllWordsCard({ summary, onPick }: { summary: DeckSummary; onPick: (deck: Deck) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(ALL_DECK)}
      aria-keyshortcuts="0"
      className={cn(
        cardBase,
        'flex items-center gap-4 border-accent/25 bg-accent-soft p-5 hover:border-accent/50 hover:shadow-key-hover',
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-accent-ink">
        <ShuffleIcon width={18} height={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[17px] font-semibold">{ALL_DECK.name}</span>
          <DueBadge count={summary.due} />
        </span>
        <span className="block text-sm text-muted">
          Las {summary.total.toLocaleString('es')}, {ALL_DECK.description.toLowerCase()}
        </span>
      </span>
      <Kbd>0</Kbd>
    </button>
  )
}
