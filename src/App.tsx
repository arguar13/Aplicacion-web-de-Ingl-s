import { lazy, Suspense, useEffect, useState } from 'react'
import { AchievementToast } from '@/components/achievements/AchievementToast'
import { DeckPicker } from '@/components/DeckPicker'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Onboarding } from '@/components/Onboarding'
import { MissionToast } from '@/components/MissionToast'
import { loadSettingsContent, SettingsDialog } from '@/components/SettingsDialog'
import { ShortcutsSheet } from '@/components/ShortcutsSheet'
import { UpdateToast } from '@/components/UpdateToast'
import { WordSheet } from '@/components/WordSheet'
import { useKeyDown } from '@/hooks/useKeyDown'
import { useNow } from '@/hooks/useNow'
import { useProtectOnceThereIsProgress } from '@/hooks/useProtectOnceThereIsProgress'
import { ALL_WORDS, COACH_DECK, type Deck } from '@/lib/decks'
import { watchAchievements } from '@/lib/achievements'
import { watchMissions } from '@/lib/missions'
import { cn } from '@/lib/cn'
import { useOnboardingDone } from '@/lib/onboarding'
import { welcomePrerendered } from '@/lib/prerender'
import { dayKey, noonOf, setLastDeck, settleStreak, useProgress } from '@/lib/progress'
import { pruneStaleAudio } from '@/lib/pwa'
import { getRoute, goBack, navigate, useRoute } from '@/lib/router'
import { formatHash, HOME, type Screen, titleOf } from '@/lib/routes'
import { updateSettings, useSettings } from '@/lib/settings'
import type { CourseLevelId } from '@/lib/courseMeta'
import type { SmartDeckKind } from '@/lib/smartDecks'
import type { Mode } from '@/lib/types'

/*
 * El inicio (y la bienvenida) van en el paquete principal. Las demás pantallas se cargan al abrirlas:
 * el primer pintado no las espera, y el service worker igualmente las guarda para usarlas sin
 * conexión.
 */
const loadGame = () => import('@/components/Game')
const Game = lazy(() => loadGame().then((module) => ({ default: module.Game })))
const SmartDeckScreen = lazy(() =>
  import('@/components/SmartDeckScreen').then((module) => ({ default: module.SmartDeckScreen })),
)
const BlitzScreen = lazy(() => import('@/components/BlitzScreen').then((module) => ({ default: module.BlitzScreen })))
const StatsScreen = lazy(() =>
  import('@/components/stats/StatsScreen').then((module) => ({ default: module.StatsScreen })),
)
const TopicsScreen = lazy(() =>
  import('@/components/TopicsScreen').then((module) => ({ default: module.TopicsScreen })),
)
const TopicGame = lazy(() => import('@/components/TopicsScreen').then((module) => ({ default: module.TopicGame })))
const CourseScreen = lazy(() =>
  import('@/components/course/CourseScreens').then((module) => ({ default: module.CourseScreen })),
)
const LevelScreen = lazy(() =>
  import('@/components/course/CourseScreens').then((module) => ({ default: module.LevelScreen })),
)
const LessonScreen = lazy(() =>
  import('@/components/course/CourseScreens').then((module) => ({ default: module.LessonScreen })),
)
const ExamScreen = lazy(() =>
  import('@/components/course/CourseScreens').then((module) => ({ default: module.ExamScreen })),
)
const QuizScreen = lazy(() =>
  import('@/components/course/CourseScreens').then((module) => ({ default: module.QuizScreen })),
)
const DictionaryScreen = lazy(() =>
  import('@/components/DictionaryScreen').then((module) => ({ default: module.DictionaryScreen })),
)

/** Tras el primer pintado se adelanta lo que casi seguro se abre después: la partida y Ajustes. */
const PREFETCH_DELAY_MS = 1500
function prefetchLikelyScreens() {
  void loadGame()
  void loadSettingsContent()
}

const go = (screen: Screen) => navigate({ screen, panel: null })
const openSettings = () => navigate({ ...getRoute(), panel: 'settings' })
const openShortcuts = () => navigate({ ...getRoute(), panel: 'shortcuts' })
const openWord = (word: string) => navigate({ ...getRoute(), panel: { word } })

/** Los paneles también se cierran solos (Esc, tocar fuera): solo se navega si la ruta aún tiene uno. */
function closePanel() {
  const route = getRoute()
  if (route.panel) goBack({ ...route, panel: null })
}

function openDeck(deck: Deck) {
  setLastDeck(deck.id)
  go({ name: 'deck', deck })
}

/** Empezar a practicar al instante: con el modo elegido y en el mazo indicado. */
function practice(deck: Deck, mode: Mode) {
  updateSettings({ mode })
  openDeck(deck)
}

/** Del nivel recorrido al siguiente, sin dejar la partida anterior en el historial. */
function continueWith(deck: Deck) {
  setLastDeck(deck.id)
  navigate({ screen: { name: 'deck', deck }, panel: null }, { replace: true })
}

const openSmart = (kind: SmartDeckKind) => go({ name: 'smart', kind })
const openCourse = () => go({ name: 'course' })
const openLevel = (level: CourseLevelId) => go({ name: 'courseLevel', level })
const openLesson = (level: CourseLevelId, lesson: string) => go({ name: 'lesson', level, lesson })
const openExam = (level: CourseLevelId) => go({ name: 'exam', level })
const openQuiz = (level: CourseLevelId | null) => go({ name: 'quiz', level })
/** Volver de un nivel al curso, o de una lección a su nivel: por el historial si se llegó desde ahí. */
const backToCourse = () => goBack({ screen: { name: 'course' }, panel: null })
const backToLevel = (level: CourseLevelId) => goBack({ screen: { name: 'courseLevel', level }, panel: null })
const startCoach = () => go({ name: 'coach' })
/** Duración del modo concentración. */
const FOCUS_MINUTES = 5

/** Al terminar la bienvenida: la sesión inteligente empieza en el nivel recomendado (o el 1). */
function startAfterOnboarding(deck: Deck) {
  updateSettings({ startLevel: deck.level ?? 1 })
  startCoach()
}
const exitToHome = () => goBack(HOME)
const recoverToHome = () => navigate(HOME, { replace: true })

/** Inicio: la bienvenida la primera vez (sin progreso), luego los niveles. */
function Home() {
  const onboarded = useOnboardingDone()
  const hasProgress = Object.keys(useProgress().cards).length > 0
  if (!onboarded && !hasProgress) return <Onboarding onStart={startAfterOnboarding} />
  return (
    <DeckPicker
      onStartCoach={startCoach}
      onStartFocus={() => go({ name: 'focus' })}
      onPick={openDeck}
      onPractice={practice}
      onOpenSmart={openSmart}
      onOpenBlitz={() => go({ name: 'blitz' })}
      onOpenTopics={() => go({ name: 'topics' })}
      onOpenCourse={openCourse}
      onOpenLesson={openLesson}
      onOpenExam={openExam}
      onOpenQuiz={openQuiz}
      onOpenWord={openWord}
      onOpenStats={() => go({ name: 'stats' })}
      onOpenDictionary={() => go({ name: 'dictionary' })}
      onOpenSettings={openSettings}
      onOpenShortcuts={openShortcuts}
    />
  )
}

function ScreenView({ screen, mode }: { screen: Screen; mode: Mode }) {
  switch (screen.name) {
    case 'home':
      return <Home />
    case 'deck':
      return (
        <Game
          key={`${screen.deck.id}:${mode}`}
          deck={screen.deck}
          mode={mode}
          onExit={exitToHome}
          onOpenSettings={openSettings}
          onNextDeck={continueWith}
        />
      )
    case 'smart':
      return <SmartDeckScreen kind={screen.kind} onExit={exitToHome} onOpenSettings={openSettings} />
    case 'topics':
      return <TopicsScreen onExit={exitToHome} onOpen={(topic) => go({ name: 'topic', topic })} />
    case 'topic':
      return <TopicGame topic={screen.topic} mode={mode} onExit={exitToHome} onOpenSettings={openSettings} />
    case 'focus':
      return (
        <Game
          deck={COACH_DECK}
          mode="en-es"
          focusMinutes={FOCUS_MINUTES}
          onExit={exitToHome}
          onOpenSettings={openSettings}
        />
      )
    case 'coach':
      // El entrenador elige el modo de cada ronda: el del selector no se usa aquí.
      return <Game deck={COACH_DECK} mode="en-es" onExit={exitToHome} onOpenSettings={openSettings} />
    case 'blitz':
      return <BlitzScreen onExit={exitToHome} />
    case 'stats':
      return <StatsScreen onExit={exitToHome} onOpenWord={openWord} />
    case 'dictionary':
      return <DictionaryScreen onExit={exitToHome} onOpenWord={openWord} />
    case 'course':
      return <CourseScreen onExit={exitToHome} onOpenLevel={openLevel} onOpenMixedQuiz={() => openQuiz(null)} />
    case 'courseLevel':
      return (
        <LevelScreen
          level={screen.level}
          onExit={backToCourse}
          onOpenLesson={(lesson) => openLesson(screen.level, lesson)}
          onOpenExam={() => openExam(screen.level)}
          onOpenQuiz={() => openQuiz(screen.level)}
        />
      )
    case 'lesson':
      return (
        <LessonScreen
          key={`${screen.level}/${screen.lesson}`}
          level={screen.level}
          lesson={screen.lesson}
          onExit={() => backToLevel(screen.level)}
          onOpenLesson={(lesson) =>
            navigate({ screen: { name: 'lesson', level: screen.level, lesson }, panel: null }, { replace: true })
          }
          onOpenExam={() => navigate({ screen: { name: 'exam', level: screen.level }, panel: null }, { replace: true })}
        />
      )
    case 'exam':
      return <ExamScreen key={screen.level} level={screen.level} onExit={() => backToLevel(screen.level)} />
    case 'quiz': {
      const { level } = screen
      return (
        <QuizScreen
          key={level ?? 'mixto'}
          level={level}
          onExit={level === null ? backToCourse : () => backToLevel(level)}
        />
      )
    }
  }
}

export default function App() {
  const route = useRoute()
  const screenKey = formatHash({ screen: route.screen, panel: null })
  // La primera pantalla, si index.html ya pintó la bienvenida, aparece sin animación.
  const [firstScreen] = useState(screenKey)
  const { mode } = useSettings()

  useEffect(() => {
    document.title = titleOf(route)
  }, [route])

  useProtectOnceThereIsProgress()

  // «?» abre la lista de atajos desde cualquier pantalla (con un panel abierto, el teclado es suyo).
  useKeyDown((event) => {
    if (event.key === '?') openShortcuts()
  })

  useEffect(() => {
    void pruneStaleAudio(ALL_WORDS.map((word) => word.id))
  }, [])

  useEffect(() => watchAchievements(), [])
  useEffect(() => watchMissions(), [])

  useEffect(() => {
    const timer = setTimeout(prefetchLikelyScreens, PREFETCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  // Al abrir la app y al cambiar de día: los protectores cuidan los días sin práctica.
  const today = dayKey(useNow())
  useEffect(() => {
    settleStreak(noonOf(today))
  }, [today])

  const { panel } = route
  return (
    <div className="flex min-h-dvh flex-col">
      <ErrorBoundary resetKey={screenKey} onGoHome={recoverToHome}>
        {/* La clave vuelve a montar el contenedor en cada pantalla y con él su animación de entrada. */}
        <div
          key={screenKey}
          className={cn('flex flex-1 flex-col', !(welcomePrerendered && screenKey === firstScreen) && 'animate-screen')}
        >
          <Suspense fallback={null}>
            <ScreenView screen={route.screen} mode={mode} />
          </Suspense>
        </div>
      </ErrorBoundary>
      <SettingsDialog open={panel === 'settings'} onClose={closePanel} />
      <ShortcutsSheet open={panel === 'shortcuts'} onClose={closePanel} />
      <WordSheet id={typeof panel === 'object' && panel !== null ? panel.word : null} onClose={closePanel} />
      <UpdateToast />
      <AchievementToast />
      <MissionToast />
    </div>
  )
}
