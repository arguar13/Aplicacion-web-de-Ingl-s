import { lazy, type ReactNode, Suspense } from 'react'
import { useDeckSummaries } from '@/hooks/useDeckSummaries'
import { useKeyDown } from '@/hooks/useKeyDown'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'
import { ALL_DECK, type Deck, LEVELS } from '@/lib/decks'
import { formatCount, plural } from '@/lib/format'
import { useProgress } from '@/lib/progress'
import type { CourseLevelId } from '@/lib/courseMeta'
import { useSettings } from '@/lib/settings'
import { dueToday, forecast, hardWords, type SmartDeckKind } from '@/lib/smartDecks'
import { type Mode, trackOf } from '@/lib/types'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { BackupReminder } from './BackupReminder'
import { CoachCard } from './CoachCard'
import { StreakBanner } from './StreakBanner'
import { Header } from './Header'
import { TodayCard } from './TodayCard'
import { cardBase, shortcutOf } from './homeCards'
import { BoltIcon, BookIcon, ChartIcon, FlameIcon, LayersIcon, SettingsIcon, StarIcon, TimerIcon } from './icons'
import { Kbd } from './ui/Kbd'

/** «Practica por tu cuenta» y los niveles, al final de la página: llegan un instante después. */
const PracticeSection = lazy(() => import('./PracticeSection').then((module) => ({ default: module.PracticeSection })))
/** «Continúa donde lo dejaste»: lo último del curso y de la práctica, a un toque. */
const ResumeSection = lazy(() => import('./ResumeSection').then((module) => ({ default: module.ResumeSection })))
/** El curso trae su cargador y su progreso: fuera del paquete inicial, llega un instante después. */
const CourseCard = lazy(() => import('./CourseCard').then((module) => ({ default: module.CourseCard })))
/** Tarjetas de más abajo: tampoco hacen falta para el primer pintado. */
const MissionsCard = lazy(() => import('./MissionsCard').then((module) => ({ default: module.MissionsCard })))
const WordOfDayCard = lazy(() => import('./WordOfDayCard').then((module) => ({ default: module.WordOfDayCard })))
const ForecastChart = lazy(() => import('./ForecastChart').then((module) => ({ default: module.ForecastChart })))

const DECKS = [...LEVELS, ALL_DECK]

const longDate = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

/** Saludo según la hora del día, con la fecha: «Buenas tardes · miércoles, 1 de octubre». */
function greeting(now: number): string {
  const hour = new Date(now).getHours()
  const hello = hour < 6 ? 'Buenas noches' : hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  return `${hello} · ${longDate.format(now)}`
}

interface Props {
  onStartCoach: () => void
  onStartFocus: () => void
  onPick: (deck: Deck) => void
  /** Empezar a practicar ya, con un modo y en un mazo. */
  onPractice: (deck: Deck, mode: Mode) => void
  onOpenSmart: (kind: SmartDeckKind) => void
  onOpenBlitz: () => void
  onOpenTopics: () => void
  onOpenCourse: () => void
  onOpenLesson: (level: CourseLevelId, lesson: string) => void
  onOpenExam: (level: CourseLevelId) => void
  onOpenQuiz: (level: CourseLevelId | null) => void
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
  onPractice,
  onOpenSmart,
  onOpenBlitz,
  onOpenTopics,
  onOpenCourse,
  onOpenLesson,
  onOpenExam,
  onOpenQuiz,
  onOpenStats,
  onOpenDictionary,
  onOpenSettings,
  onOpenShortcuts,
  onOpenWord,
}: Props) {
  const progress = useProgress()
  const { mode } = useSettings()
  const track = trackOf(mode)
  const now = useNow()
  const summaryOf = useDeckSummaries(track)
  const total = summaryOf(ALL_DECK)
  const anyProgress = Object.keys(progress.cards).length > 0

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
        wide
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
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-7 pb-14 sm:px-6 sm:pt-10">
        {/* Saludo y la acción principal, con el resumen de hoy al lado. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          <div className="flex flex-col lg:col-span-2">
            <div className="animate-rise">
              <p className="text-sm font-medium text-muted first-letter:uppercase">{greeting(now)}</p>
              <h1 className="mt-1.5 font-display text-4xl leading-[1.05] sm:text-5xl">
                Tu inglés, <span className="text-brand">hoy</span>.
              </h1>
            </div>
            <div className="mt-6 flex-1">
              <CoachCard now={now} onStart={onStartCoach} />
            </div>
          </div>
          <TodayCard now={now} mastered={total.mastered} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 empty:hidden lg:grid-cols-2 lg:[&>:only-child]:col-span-2">
          <StreakBanner progress={progress} now={now} />
          <BackupReminder onOpenSettings={onOpenSettings} />
        </div>

        <Suspense fallback={null}>
          <ResumeSection
            now={now}
            onPractice={onPractice}
            onOpenLesson={onOpenLesson}
            onOpenExam={onOpenExam}
            onOpenQuiz={onOpenQuiz}
          />
        </Suspense>

        {/* Accesos rápidos: cada modo de práctica a un toque. */}
        <section aria-label="Accesos rápidos" className="mt-8">
          <ul
            className={cn('grid grid-cols-2 gap-3', anyProgress ? 'sm:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-4')}
          >
            {anyProgress && (
              <li>
                <QuickTile
                  icon={<FlameIcon />}
                  tone="bad"
                  title="Mis difíciles"
                  detail={hard > 0 ? plural(hard, 'palabra') : 'Ninguna por ahora'}
                  shortcut={hard > 0 ? 'D' : undefined}
                  disabled={hard === 0}
                  onClick={() => onOpenSmart('hard')}
                />
              </li>
            )}
            {anyProgress && (
              <li>
                <QuickTile
                  icon={<StarIcon filled={favorites > 0} />}
                  tone="gold"
                  title="Favoritas"
                  detail={favorites > 0 ? plural(favorites, 'palabra') : 'Márcalas con la estrella'}
                  shortcut={favorites > 0 ? 'F' : undefined}
                  disabled={favorites === 0}
                  onClick={() => onOpenSmart('favorites')}
                />
              </li>
            )}
            <li>
              <QuickTile
                icon={<BoltIcon />}
                tone="accent"
                title="Relámpago"
                detail={progress.blitzBest > 0 ? `Récord: ${formatCount(progress.blitzBest)}` : '60 segundos'}
                onClick={onOpenBlitz}
              />
            </li>
            <li>
              <QuickTile
                icon={<TimerIcon />}
                tone="ok"
                title="Concentración"
                detail="5 minutos sin pausa"
                onClick={onStartFocus}
              />
            </li>
            <li>
              <QuickTile
                icon={<LayersIcon />}
                tone="accent"
                title="Colecciones"
                detail="Comida, viajes y más"
                onClick={onOpenTopics}
              />
            </li>
            <li>
              <QuickTile
                icon={<BookIcon />}
                tone="accent"
                title="Diccionario"
                detail={`${formatCount(total.total)} palabras`}
                onClick={onOpenDictionary}
              />
            </li>
          </ul>
        </section>

        {/* El curso, las misiones, el repaso y la palabra del día. */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <div className="md:col-span-2">
            <Suspense fallback={<CardPlaceholder className="min-h-44" />}>
              <CourseCard
                onOpenCourse={onOpenCourse}
                onOpenLesson={onOpenLesson}
                onOpenExam={onOpenExam}
                onOpenQuiz={onOpenQuiz}
              />
            </Suspense>
          </div>
          {/* En tablet, las misiones van al final a todo el ancho; en escritorio, en su columna. */}
          <div className="md:order-last md:col-span-2 lg:order-none lg:col-span-1 lg:row-span-2">
            <Suspense fallback={<CardPlaceholder className="min-h-96" />}>
              <MissionsCard now={now} />
            </Suspense>
          </div>
          {anyProgress && (
            <ReviewCard
              due={due}
              forecast={forecast(progress, track, now)}
              now={now}
              onOpen={() => onOpenSmart('review')}
            />
          )}
          <div className={cn(!anyProgress && 'md:col-span-2')}>
            <Suspense fallback={<CardPlaceholder className="min-h-64" />}>
              <WordOfDayCard now={now} onOpenWord={onOpenWord} />
            </Suspense>
          </div>
        </div>

        <Suspense fallback={<div className="mt-14 min-h-[60rem] sm:mt-16" aria-hidden />}>
          <PracticeSection mode={mode} lastDeckId={progress.lastDeckId} onPractice={onPractice} onPick={onPick} />
        </Suspense>

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

/** Hueco con el aspecto de una tarjeta mientras llega una diferida: nada salta al cargar. */
function CardPlaceholder({ className }: { className: string }) {
  return <div aria-hidden className={cn('h-full rounded-3xl border border-line bg-surface shadow-card', className)} />
}

const disabledCard =
  'disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-line disabled:hover:shadow-card'

const TILE_TONES = {
  accent: 'bg-accent-soft text-accent',
  ok: 'bg-ok-soft text-ok',
  bad: 'bg-bad-soft text-bad',
  gold: 'bg-gold-soft text-gold',
} as const

/** Acceso rápido: icono, nombre y un detalle (cuántas hay, el récord…), con su atajo si lo tiene. */
function QuickTile({
  icon,
  tone,
  title,
  detail,
  shortcut,
  disabled = false,
  onClick,
}: {
  icon: ReactNode
  tone: keyof typeof TILE_TONES
  title: string
  detail: string
  shortcut?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-keyshortcuts={shortcut}
      className={cn(
        cardBase,
        'flex h-full flex-col border-line bg-surface p-4 shadow-card hover:border-accent/40 hover:shadow-key-hover',
        disabledCard,
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span
          className={cn(
            'grid size-10 place-items-center rounded-2xl transition-transform group-hover:-rotate-6 group-disabled:rotate-0',
            disabled ? 'bg-bg text-muted' : TILE_TONES[tone],
          )}
        >
          {icon}
        </span>
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </span>
      <span className="mt-4 block text-[15px] font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs text-muted">{detail}</span>
    </button>
  )
}

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
        'flex h-full flex-col border-line bg-surface p-5 shadow-card sm:p-6',
        'hover:border-accent/40 hover:shadow-key-hover',
        disabledCard,
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
      <Suspense fallback={<span className="mt-5 block h-24 w-full" aria-hidden />}>
        <ForecastChart counts={counts} now={now} className="mt-5 w-full" />
      </Suspense>
      <span className="mt-2 block text-[11px] text-muted">
        {upcoming > 0 ? `${plural(upcoming, 'repaso')} en los próximos 6 días` : 'Sin repasos en los próximos días'}
      </span>
    </button>
  )
}
