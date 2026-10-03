import { type ReactNode, useEffect, useState } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { cn } from '@/lib/cn'
import {
  type CourseLevel,
  type Exercise,
  type Lesson,
  type LevelState,
  retryCourseLevel,
  useAllCourseLevels,
  useCourseLevel,
} from '@/lib/course'
import { COURSE_LEVELS, type CourseLevelId, courseLevelInfo, EXAM_PASS, LESSON_PASS } from '@/lib/courseMeta'
import {
  examPassed,
  lessonKey,
  levelSummary,
  type QuizKey,
  recordExam,
  recordLesson,
  recordQuiz,
  useCourseProgress,
  XP_EXAM,
  XP_EXERCISE,
  XP_LESSON,
  XP_QUIZ_PERFECT,
} from '@/lib/courseProgress'
import { buildMixedQuiz, buildQuiz, MIXED_QUIZ_SIZE, QUIZ_SIZE, quizPool, quizSeed } from '@/lib/courseQuiz'
import { correctAnswer, scoreOf, SKILL_LABEL, skillBreakdown, type SkillScore, type Verdict } from '@/lib/exercises'
import { feedback } from '@/lib/feedback'
import { formatCount, plural } from '@/lib/format'
import { Confetti } from '../Confetti'
import { Header } from '../Header'
import { ArrowLeftIcon, ArrowRightIcon, BoltIcon, CheckCircleIcon, GraduationIcon } from '../icons'
import { SpeakExampleButton } from '../SpeakExampleButton'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'
import { Surface } from '../ui/Surface'
import { clearRun, type CourseRun, getResume, runOf, type RunTarget, saveRun, useResume } from '@/lib/resume'
import { ExerciseRunner, validStart } from './ExerciseRunner'

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
    >
      <ArrowLeftIcon width={16} height={16} />
      {label}
    </button>
  )
}

function Shell({ back, children }: { back: { label: string; onClick: () => void }; children: ReactNode }) {
  useKeyDown((event) => {
    if (event.key === 'Escape') back.onClick()
  })
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-14 sm:px-6">
        <BackLink label={back.label} onClick={back.onClick} />
        {children}
      </main>
    </>
  )
}

/** Mientras llega el contenido de un nivel, o si no se pudo cargar. */
function Pending({ state, level }: { state: Exclude<LevelState, { status: 'ready' }>; level: CourseLevelId }) {
  if (state.status === 'loading') {
    return (
      <div className="mt-6 space-y-3" aria-busy aria-label="Cargando el nivel">
        <div className="h-6 w-2/3 animate-pulse rounded-full bg-line" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-line" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-line" />
      </div>
    )
  }
  return (
    <Surface className="mt-6 px-6 py-8 text-center">
      <p className="text-[15px] text-muted">
        No se pudo cargar este nivel. Si no tienes conexión, prueba cuando vuelva.
      </p>
      <Button variant="primary" onClick={() => retryCourseLevel(level)} className="mt-4">
        Reintentar
      </Button>
    </Surface>
  )
}

const pct = (ratio: number) => `${Math.round(ratio * 100)} %`

// --- Lista de niveles -----------------------------------------------------------------------------

interface CourseProps {
  onExit: () => void
  onOpenLevel: (level: CourseLevelId) => void
  onOpenMixedQuiz: () => void
}

/** El curso: los seis niveles con su avance, y el quiz mixto. */
export function CourseScreen({ onExit, onOpenLevel, onOpenMixedQuiz }: CourseProps) {
  const progress = useCourseProgress()
  return (
    <Shell back={{ label: 'Inicio', onClick: onExit }}>
      <h1 className="mt-4 font-display text-5xl leading-none">Curso de inglés</h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
        De A1 a C2, nivel por nivel: cada lección explica un tema con ejemplos y lo practica con ejercicios. Al final de
        cada nivel, un examen; se aprueba con el {Math.round(EXAM_PASS * 100)} %.
      </p>
      <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {COURSE_LEVELS.map((info, index) => (
          <li
            key={info.id}
            className="animate-rise"
            style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
          >
            <LevelCard id={info.id} passed={examPassed(progress, info.id)} onOpen={() => onOpenLevel(info.id)} />
          </li>
        ))}
      </ol>
      <QuizCard
        title="Quiz mixto"
        description={`${MIXED_QUIZ_SIZE} preguntas de todos los niveles, distintas cada vez.`}
        best={progress.quizzes.mixto ?? null}
        onOpen={onOpenMixedQuiz}
      />
    </Shell>
  )
}

/** Acceso a un quiz, con la mejor nota si ya se hizo. */
function QuizCard({
  title,
  description,
  best,
  onOpen,
}: {
  title: string
  description: string
  best: { best: number } | null
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group mt-4 flex w-full cursor-pointer items-center gap-4 rounded-3xl border border-line bg-surface p-5 text-left shadow-card',
        'transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-key-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition-transform group-hover:rotate-12">
        <BoltIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">{title}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
      {best && (
        <span className="shrink-0 text-right">
          <span className="block text-[10px] font-medium tracking-[0.14em] text-muted uppercase">Mejor</span>
          <span className="block font-display text-2xl leading-none tabular-nums">{pct(best.best)}</span>
        </span>
      )}
      <ArrowRightIcon className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

function LevelCard({ id, passed, onOpen }: { id: CourseLevelId; passed: boolean; onOpen: () => void }) {
  const info = courseLevelInfo(id)
  const state = useCourseLevel(id)
  const progress = useCourseProgress()
  const summary =
    state.status === 'ready'
      ? levelSummary(
          progress,
          id,
          state.level.lessons.map((lesson) => lesson.id),
        )
      : null
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Nivel ${info.name}, ${info.title}`}
      className={cn(
        'group flex h-full w-full cursor-pointer gap-4 rounded-3xl border border-line bg-surface p-5 text-left shadow-card',
        'transition-[translate,scale,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-key-hover active:translate-y-0 active:scale-[0.99]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
    >
      <span className={cn('w-12 shrink-0 font-display text-4xl leading-[0.9]', passed ? 'text-ok' : 'text-brand')}>
        {info.name}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[17px] font-semibold">{info.title}</span>
          {passed && (
            <Badge tone="ok-soft" caps>
              Aprobado
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{info.description}</span>
        <span className="mt-auto pt-3">
          <span
            role="progressbar"
            aria-label="Lecciones terminadas"
            aria-valuemin={0}
            aria-valuemax={summary?.total ?? 0}
            aria-valuenow={summary?.done ?? 0}
            className="flex h-1.5 overflow-hidden rounded-full bg-line"
          >
            <span
              className="bg-accent transition-[width] duration-500"
              style={{ width: summary && summary.total ? `${(summary.done / summary.total) * 100}%` : '0%' }}
            />
          </span>
          <span className="mt-1.5 block text-[11px] text-muted tabular-nums">
            {summary === null
              ? 'Cargando…'
              : summary.total === 0
                ? 'Contenido en camino'
                : `${summary.done} de ${summary.total} lecciones superadas`}
          </span>
        </span>
      </span>
    </button>
  )
}

// --- Un nivel --------------------------------------------------------------------------------------

interface LevelProps {
  level: CourseLevelId
  onExit: () => void
  onOpenLesson: (lesson: string) => void
  onOpenExam: () => void
  onOpenQuiz: () => void
}

export function LevelScreen({ level, onExit, onOpenLesson, onOpenExam, onOpenQuiz }: LevelProps) {
  const info = courseLevelInfo(level)
  const state = useCourseLevel(level)
  const progress = useCourseProgress()
  return (
    <Shell back={{ label: 'Curso', onClick: onExit }}>
      <p className="mt-4 text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Nivel {info.name}</p>
      <h1 className="mt-1 font-display text-5xl leading-none">{info.title}</h1>
      {state.status !== 'ready' ? (
        <Pending state={state} level={level} />
      ) : (
        <LevelContent
          level={state.level}
          progress={progress}
          onOpenLesson={onOpenLesson}
          onOpenExam={onOpenExam}
          onOpenQuiz={onOpenQuiz}
        />
      )}
    </Shell>
  )
}

function LevelContent({
  level,
  progress,
  onOpenLesson,
  onOpenExam,
  onOpenQuiz,
}: {
  level: CourseLevel
  progress: ReturnType<typeof useCourseProgress>
  onOpenLesson: (lesson: string) => void
  onOpenExam: () => void
  onOpenQuiz: () => void
}) {
  const resume = useResume()
  const summary = levelSummary(
    progress,
    level.id,
    level.lessons.map((lesson) => lesson.id),
  )
  if (level.lessons.length === 0) {
    return (
      <Surface className="mt-6 px-6 py-8 text-center">
        <p className="text-[15px] text-muted">El contenido de este nivel está en camino.</p>
      </Surface>
    )
  }
  return (
    <>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">{level.intro}</p>
      <Surface as="section" aria-labelledby="objetivos" className="mt-6 px-5 py-5 sm:px-6">
        <h2 id="objetivos" className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
          Al terminar sabrás
        </h2>
        <ul className="mt-3 space-y-2">
          {level.goals.map((goal) => (
            <li key={goal} className="flex items-start gap-2.5 text-[15px]">
              <CheckCircleIcon width={18} height={18} className="mt-0.5 shrink-0 text-accent" />
              {goal}
            </li>
          ))}
        </ul>
      </Surface>

      <h2 className="mt-8 mb-3 text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
        Lecciones superadas · {summary.done} de {summary.total}
      </h2>
      <ol className="space-y-2.5">
        {level.lessons.map((lesson, index) => {
          const attempt = progress.lessons[lessonKey(level.id, lesson.id)]
          const passed = attempt !== undefined && attempt.best >= LESSON_PASS
          const run = runOf(resume, { kind: 'lesson', level: level.id, lesson: lesson.id })
          const midway = run?.step === 'practice' && run.index > 0 ? run.index : null
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => onOpenLesson(lesson.id)}
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-4 rounded-2xl border bg-surface px-4 py-3.5 text-left shadow-card',
                  'transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-key-hover',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  midway !== null ? 'border-accent/40' : 'border-line',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums',
                    passed ? 'bg-ok-soft text-ok' : attempt ? 'bg-gold-soft text-gold' : 'bg-accent-soft text-accent',
                  )}
                >
                  {passed ? <CheckCircleIcon width={18} height={18} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{lesson.title}</span>
                  <span className="block text-[13px] leading-snug text-muted">{lesson.summary}</span>
                  {midway !== null ? (
                    <span className="mt-0.5 block text-[11px] font-medium text-accent tabular-nums">
                      En curso · ejercicio {midway + 1} de {lesson.exercises.length}
                    </span>
                  ) : attempt ? (
                    <span className={cn('mt-0.5 block text-[11px] tabular-nums', passed ? 'text-ok' : 'text-gold')}>
                      {passed
                        ? `Superada · mejor nota ${pct(attempt.best)}`
                        : `Por superar · ${pct(attempt.best)} (hace falta ${pct(LESSON_PASS)})`}
                    </span>
                  ) : null}
                </span>
                <ArrowRightIcon className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={onOpenExam}
        className={cn(
          'group mt-6 flex w-full cursor-pointer items-center gap-4 rounded-3xl border p-5 text-left',
          'transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-key-hover',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          summary.passed ? 'border-ok/40 bg-ok-soft/50' : 'border-accent/25 bg-accent-soft',
        )}
      >
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full',
            summary.passed ? 'bg-ok text-ok-ink' : 'bg-brand text-accent-ink',
          )}
        >
          <GraduationIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">Examen del nivel {courseLevelInfo(level.id).name}</span>
          <span className="block text-sm text-muted">
            {summary.passed && summary.exam
              ? `Aprobado con ${pct(summary.exam.best)}. Puedes repetirlo cuando quieras.`
              : summary.exam
                ? `Última nota: ${pct(summary.exam.best)}. Se aprueba con ${pct(EXAM_PASS)}.`
                : `${plural(level.exam.length, 'pregunta')} · se aprueba con ${pct(EXAM_PASS)}`}
          </span>
        </span>
        <ArrowRightIcon className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </button>
      <QuizCard
        title="Quiz rápido"
        description={`${QUIZ_SIZE} preguntas al azar de este nivel, distintas cada vez.`}
        best={progress.quizzes[level.id] ?? null}
        onOpen={onOpenQuiz}
      />
    </>
  )
}

// --- Una lección ------------------------------------------------------------------------------------

interface LessonProps {
  level: CourseLevelId
  lesson: string
  onExit: () => void
  onOpenLesson: (lesson: string) => void
  onOpenExam: () => void
}

export function LessonScreen({ level, lesson: lessonId, onExit, onOpenLesson, onOpenExam }: LessonProps) {
  const info = courseLevelInfo(level)
  const state = useCourseLevel(level)
  const back = { label: `Nivel ${info.name}`, onClick: onExit }
  if (state.status !== 'ready') {
    return (
      <Shell back={back}>
        <Pending state={state} level={level} />
      </Shell>
    )
  }
  const index = state.level.lessons.findIndex((lesson) => lesson.id === lessonId)
  const lesson = state.level.lessons[index]
  if (!lesson) {
    return (
      <Shell back={back}>
        <Surface className="mt-6 px-6 py-8 text-center">
          <h1 className="font-display text-3xl">Esta lección no existe</h1>
          <p className="mt-2 text-[15px] text-muted">Quizá el enlace está mal escrito.</p>
          <Button variant="primary" onClick={onExit} className="mt-5">
            Ver el nivel {info.name}
          </Button>
        </Surface>
      </Shell>
    )
  }
  const next = state.level.lessons[index + 1]
  return (
    <Shell back={back}>
      <LessonView
        key={lesson.id}
        level={level}
        lesson={lesson}
        number={index + 1}
        total={state.level.lessons.length}
        onNext={next ? () => onOpenLesson(next.id) : onOpenExam}
        nextLabel={next ? `Siguiente: ${next.title}` : `Examen del nivel ${info.name}`}
        onExit={onExit}
      />
    </Shell>
  )
}

type Phase = { step: 'read' } | { step: 'practice' } | { step: 'done'; verdicts: Verdict[]; first: boolean }

/** Desplazamiento suave hasta una sección (sin animación con movimiento reducido). */
function scrollToId(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/** Una tanda a medio hacer, si cuadra con los ejercicios de ahora: el ejercicio y lo respondido. */
function savedStart(run: CourseRun | null, total: number) {
  return run?.step === 'practice' ? validStart(run, total) : null
}

function LessonView({
  level,
  lesson,
  number,
  total,
  onNext,
  nextLabel,
  onExit,
}: {
  level: CourseLevelId
  lesson: Lesson
  number: number
  total: number
  onNext: () => void
  nextLabel: string
  onExit: () => void
}) {
  const [target] = useState<RunTarget>(() => ({ kind: 'lesson', level, lesson: lesson.id }))
  const exercises = lesson.exercises
  // Si se dejó a mitad de los ejercicios, se vuelve directamente a ellos, en el mismo punto.
  const [start, setStart] = useState(() => savedStart(runOf(getResume(), target), exercises.length))
  const [phase, setPhase] = useState<Phase>(() => (start ? { step: 'practice' } : { step: 'read' }))
  // Cambia al empezar de cero: vuelve a montar el corredor desde el primer ejercicio.
  const [attemptId, setAttemptId] = useState(0)
  const resume = useResume()
  const pending = savedStart(runOf(resume, target), exercises.length)
  const progress = useCourseProgress()
  const attempt = progress.lessons[lessonKey(level, lesson.id)]

  // Abrirla ya cuenta como «por aquí ibas», aunque aún no se haya hecho ningún ejercicio.
  useEffect(() => {
    if (!runOf(getResume(), target)) saveRun(target, { step: 'read', index: 0, verdicts: [] })
  }, [target])

  function practice(from: 'saved' | 'scratch') {
    const resumeFrom = from === 'saved' ? pending : null
    if (!resumeFrom) saveRun(target, { step: 'practice', index: 0, verdicts: [] })
    setStart(resumeFrom)
    setAttemptId((id) => id + 1)
    setPhase({ step: 'practice' })
    window.scrollTo({ top: 0 })
  }

  function finish(verdicts: Verdict[]) {
    const score = scoreOf(verdicts)
    const first = attempt === undefined
    recordLesson(level, lesson.id, score.correct + score.almost, score.ratio)
    clearRun(target)
    feedback(score.ratio >= LESSON_PASS ? 'goal' : 'wrong')
    setPhase({ step: 'done', verdicts, first })
    window.scrollTo({ top: 0 })
  }

  const examples = lesson.sections.reduce((sum, section) => sum + (section.examples?.length ?? 0), 0)

  return (
    <>
      <p className="mt-4 text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
        Lección {number} de {total}
      </p>
      <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">{lesson.title}</h1>
      <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted">{lesson.summary}</p>

      {phase.step === 'read' && (
        <>
          {/* Índice: la lección es larga; cada apartado a un toque, y los ejercicios al final. */}
          <nav aria-label="Contenido de la lección" className="mt-5">
            <p className="text-xs text-muted">
              {plural(lesson.sections.length, 'apartado')} · {plural(examples, 'ejemplo')} ·{' '}
              {plural(exercises.length, 'ejercicio')}
            </p>
            <ol className="mt-2 flex flex-wrap gap-2">
              {lesson.sections.map((section, i) => (
                <li key={section.heading}>
                  <button
                    type="button"
                    onClick={() => scrollToId(`apartado-${i + 1}`)}
                    className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-muted transition-colors hover:border-accent/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="text-accent tabular-nums">{i + 1}.</span> {section.heading}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => scrollToId('a-practicar')}
                  className="cursor-pointer rounded-full bg-accent-soft px-3 py-1 text-[13px] font-medium text-accent transition-colors hover:bg-brand hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Ir a los ejercicios
                </button>
              </li>
            </ol>
          </nav>
          {lesson.sections.map((section, i) => (
            <SectionView key={section.heading} id={`apartado-${i + 1}`} number={i + 1} section={section} />
          ))}
          <div id="a-practicar" className="mt-6 flex scroll-mt-6 flex-col items-center gap-2">
            {pending ? (
              <>
                <Button variant="primary" size="lg" onClick={() => practice('saved')}>
                  Seguir con los ejercicios · {pending.index + 1} de {exercises.length}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => practice('scratch')}>
                  Empezar de cero
                </Button>
              </>
            ) : (
              <Button variant="primary" size="lg" onClick={() => practice('scratch')}>
                Practicar · {plural(exercises.length, 'ejercicio')}
              </Button>
            )}
            {attempt && (
              <p className="text-xs text-muted">
                {attempt.best >= LESSON_PASS
                  ? `Superada con un ${pct(attempt.best)}. Repetirla afianza.`
                  : `Tu mejor nota es ${pct(attempt.best)}: se supera con el ${pct(LESSON_PASS)}.`}
              </p>
            )}
          </div>
        </>
      )}

      {phase.step === 'practice' && (
        <div className="mt-6">
          {start && (
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-accent/25 bg-accent-soft px-4 py-2.5 text-[13px]">
              <span className="min-w-0 basis-full text-ink sm:flex-1 sm:basis-0">
                Retomas donde lo dejaste: ejercicio {start.index + 1} de {exercises.length}.
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPhase({ step: 'read' })}>
                Ver la teoría
              </Button>
              <Button variant="ghost" size="sm" onClick={() => practice('scratch')}>
                Empezar de cero
              </Button>
            </div>
          )}
          <ExerciseRunner
            key={attemptId}
            exercises={exercises}
            label={`Lección ${number}`}
            initial={start}
            onProgress={(index, verdicts) => saveRun(target, { step: 'practice', index, verdicts })}
            onFinish={finish}
          />
        </div>
      )}

      {phase.step === 'done' && (
        <LessonResult
          verdicts={phase.verdicts}
          exercises={exercises}
          first={phase.first}
          nextLabel={nextLabel}
          onRetry={() => practice('scratch')}
          onReview={() => {
            setPhase({ step: 'read' })
            window.scrollTo({ top: 0 })
          }}
          onNext={onNext}
          onExit={onExit}
        />
      )}
    </>
  )
}

/** Un apartado de la teoría: explicación, tabla, ejemplos con voz y el consejo. */
function SectionView({ id, number, section }: { id: string; number: number; section: Lesson['sections'][number] }) {
  return (
    <Surface as="section" id={id} aria-labelledby={`${id}-titulo`} className="mt-5 scroll-mt-6 px-5 py-5 sm:px-6">
      <h2 id={`${id}-titulo`} className="text-[19px] font-semibold">
        <span className="mr-1.5 text-accent tabular-nums">{number}.</span>
        {section.heading}
      </h2>
      {section.body.map((paragraph) => (
        <p key={paragraph} className="mt-2.5 text-[15px] leading-relaxed">
          {paragraph}
        </p>
      ))}
      {section.table && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {section.table.headers.map((header) => (
                  <th
                    key={header}
                    className="border-b border-line-strong px-2 py-1.5 text-left text-[11px] font-semibold tracking-wide text-muted uppercase"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row.join('|')} className="border-b border-line last:border-0">
                  {row.map((cell, i) => (
                    <td
                      key={`${section.table?.headers[i] ?? i}:${cell}`}
                      lang={i === row.length - 1 && /[a-záéíóú]{3}/.test(cell) ? undefined : 'en'}
                      className="px-2 py-1.5"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.examples && (
        <ul className="mt-4 space-y-2.5">
          {section.examples.map((example) => (
            <li key={example.en} className="flex items-start gap-2 border-l-2 border-accent/60 pl-3">
              <span className="min-w-0 flex-1">
                <span lang="en" className="block text-[16px] font-medium">
                  {example.en}
                </span>
                <span className="block text-[13px] text-muted">{example.es}</span>
              </span>
              <SpeakExampleButton text={example.en} className="-mt-1.5" />
            </li>
          ))}
        </ul>
      )}
      {section.tip && (
        <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-[14px] leading-snug text-accent">
          <span className="font-semibold">Ojo: </span>
          {section.tip}
        </p>
      )}
    </Surface>
  )
}

/**
 * El resultado de una lección. Con LESSON_PASS o más está superada y se sigue; por debajo, lo
 * natural es repetir los ejercicios (también se puede seguir igualmente).
 */
function LessonResult({
  verdicts,
  exercises,
  first,
  nextLabel,
  onRetry,
  onReview,
  onNext,
  onExit,
}: {
  verdicts: Verdict[]
  exercises: readonly Exercise[]
  first: boolean
  nextLabel: string
  onRetry: () => void
  onReview: () => void
  onNext: () => void
  onExit: () => void
}) {
  const score = scoreOf(verdicts)
  const passed = score.ratio >= LESSON_PASS
  const xp = (score.correct + score.almost) * XP_EXERCISE + (first ? XP_LESSON : 0)
  return (
    <Result
      title={passed ? '¡Lección superada!' : 'Casi: un repaso más'}
      verdicts={verdicts}
      exercises={exercises}
      xp={xp}
      detail={
        passed
          ? first
            ? `Primera vez: +${XP_LESSON} XP por terminarla.`
            : 'Repetir afianza lo aprendido.'
          : `Se supera con el ${pct(LESSON_PASS)}. Repasa lo que fallaste (abajo) y vuelve a intentarlo: cada intento afianza.`
      }
      celebrate={passed}
      actions={
        passed ? (
          <>
            <Button size="lg" onClick={onReview}>
              Repasar la lección
            </Button>
            <Button variant="primary" size="lg" onClick={onNext}>
              {nextLabel}
              <Kbd tone="accent">Enter</Kbd>
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="lg" onClick={onNext}>
              Seguir igualmente
            </Button>
            <Button size="lg" onClick={onReview}>
              Repasar la teoría
            </Button>
            <Button variant="primary" size="lg" onClick={onRetry}>
              Repetir los ejercicios
              <Kbd tone="accent">Enter</Kbd>
            </Button>
          </>
        )
      }
      onEnter={passed ? onNext : onRetry}
      onExit={onExit}
    />
  )
}

// --- Examen ----------------------------------------------------------------------------------------

interface ExamProps {
  level: CourseLevelId
  onExit: () => void
}

type ExamPhase = { step: 'intro' } | { step: 'running' } | { step: 'done'; verdicts: Verdict[]; passed: boolean }

/** Minutos orientativos de un examen: lo que suele llevar cada tipo de pregunta. */
function examMinutes(exercises: readonly Exercise[]): number {
  const seconds = exercises.reduce(
    (sum, exercise) =>
      sum +
      (exercise.type === 'reading' || exercise.type === 'listening'
        ? 150
        : exercise.type === 'translate' || exercise.type === 'transform'
          ? 60
          : 30),
    0,
  )
  return Math.max(5, Math.round(seconds / 300) * 5)
}

export function ExamScreen({ level, onExit }: ExamProps) {
  const info = courseLevelInfo(level)
  const state = useCourseLevel(level)
  const progress = useCourseProgress()
  const [target] = useState<RunTarget>(() => ({ kind: 'exam', level }))
  const resume = useResume()
  const [phase, setPhase] = useState<ExamPhase>({ step: 'intro' })
  const [start, setStart] = useState<ReturnType<typeof validStart>>(null)
  const back = { label: `Nivel ${info.name}`, onClick: onExit }
  if (state.status !== 'ready') {
    return (
      <Shell back={back}>
        <Pending state={state} level={level} />
      </Shell>
    )
  }
  const exam = state.level.exam
  const previous = progress.exams[level]
  const pending = savedStart(runOf(resume, target), exam.length)
  const skills = skillBreakdown(
    exam,
    exam.map(() => 'correct'),
  )

  function begin(from: 'saved' | 'scratch') {
    const resumeFrom = from === 'saved' ? pending : null
    if (!resumeFrom) saveRun(target, { step: 'practice', index: 0, verdicts: [] })
    setStart(resumeFrom)
    setPhase({ step: 'running' })
  }

  function finish(verdicts: Verdict[]) {
    const score = scoreOf(verdicts)
    const passed = recordExam(level, score.correct + score.almost, score.ratio)
    clearRun(target)
    feedback(passed ? 'goal' : 'wrong')
    setPhase({ step: 'done', verdicts, passed })
    window.scrollTo({ top: 0 })
  }

  return (
    <Shell back={back}>
      <p className="mt-4 text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Nivel {info.name}</p>
      <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">Examen del nivel</h1>

      {phase.step === 'intro' && (
        <Surface className="mt-6 px-6 py-8 text-center sm:px-9">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent-soft text-accent">
            <GraduationIcon width={30} height={30} />
          </span>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            {plural(exam.length, 'pregunta')} de todo el nivel, sin pistas, como en un examen oficial: unos{' '}
            {examMinutes(exam)} minutos. Se aprueba con el {pct(EXAM_PASS)}.
            {previous && ` Tu mejor nota: ${pct(previous.best)}.`}
          </p>
          <ul className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-2" aria-label="Partes del examen">
            {skills.map((skill) => (
              <li key={skill.skill}>
                <Badge tone="accent-soft">
                  {SKILL_LABEL[skill.skill]} · {skill.total}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col items-center gap-2">
            {pending ? (
              <>
                <Button variant="primary" size="lg" onClick={() => begin('saved')}>
                  Continuar el examen · {pending.index + 1} de {exam.length}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => begin('scratch')}>
                  Empezar de nuevo
                </Button>
              </>
            ) : (
              <Button variant="primary" size="lg" onClick={() => begin('scratch')}>
                Empezar el examen
              </Button>
            )}
          </div>
        </Surface>
      )}

      {phase.step === 'running' && (
        <div className="mt-6">
          <ExerciseRunner
            exercises={exam}
            label={`Examen ${info.name}`}
            initial={start}
            onProgress={(index, verdicts) => saveRun(target, { step: 'practice', index, verdicts })}
            onFinish={finish}
          />
        </div>
      )}

      {phase.step === 'done' && (
        <Result
          title={phase.passed ? `¡Nivel ${info.name} aprobado!` : 'Esta vez no, pero casi'}
          verdicts={phase.verdicts}
          exercises={exam}
          breakdown={skillBreakdown(exam, phase.verdicts)}
          xp={
            (scoreOf(phase.verdicts).correct + scoreOf(phase.verdicts).almost) * XP_EXERCISE +
            (phase.passed && !(previous && previous.best >= EXAM_PASS) ? XP_EXAM : 0)
          }
          detail={
            phase.passed
              ? 'Ya puedes pasar al siguiente nivel. Repetir el examen afianza lo aprendido.'
              : `Mira qué destreza flojeó, repasa las lecciones de lo que fallaste y vuelve a intentarlo: se aprueba con el ${pct(EXAM_PASS)}.`
          }
          celebrate={phase.passed}
          actions={
            <>
              <Button size="lg" onClick={() => setPhase({ step: 'intro' })}>
                Repetir el examen
              </Button>
              <Button variant="primary" size="lg" onClick={onExit}>
                {phase.passed ? 'Volver al nivel' : 'Repasar las lecciones'}
                <Kbd tone="accent">Enter</Kbd>
              </Button>
            </>
          }
          onEnter={onExit}
          onExit={onExit}
        />
      )}
    </Shell>
  )
}

/** Cómo se cita un ejercicio fallado en el resumen. */
function missedLabel(exercise: Exercise): string {
  switch (exercise.type) {
    case 'choice':
    case 'fill':
      return exercise.prompt
    case 'reading':
    case 'listening':
      return exercise.title
    case 'order':
    case 'translate':
      return exercise.es
    case 'transform':
      return `${exercise.original} (${exercise.keyword})`
    case 'spot':
      return exercise.parts.join(' ')
  }
}

// --- Resultado ---------------------------------------------------------------------------------------

function Result({
  title,
  verdicts,
  exercises,
  xp,
  detail,
  breakdown,
  celebrate = true,
  actions,
  onEnter,
}: {
  title: string
  verdicts: Verdict[]
  exercises: readonly Exercise[]
  xp: number
  detail: string
  /** Nota por destreza (exámenes): dónde está fuerte y qué conviene repasar. */
  breakdown?: SkillScore[]
  celebrate?: boolean
  actions: ReactNode
  onEnter: () => void
  onExit: () => void
}) {
  const score = scoreOf(verdicts)
  const missed = verdicts
    .map((verdict, i) => ({ verdict, exercise: exercises[i] }))
    .filter((item) => item.verdict === 'wrong')
  useKeyDown((event) => {
    if (event.key === 'Enter') onEnter()
  })
  return (
    <Surface as="section" aria-labelledby="resultado" className="mt-6 animate-rise px-6 pt-8 pb-6 text-center sm:px-8">
      {celebrate && <Confetti pieces={score.ratio >= EXAM_PASS ? 140 : 60} />}
      <h2 id="resultado" className="font-display text-4xl leading-tight">
        {title}
      </h2>
      <p className="mt-3 font-display text-6xl tabular-nums">{pct(score.ratio)}</p>
      <p className="mt-1 text-sm text-muted">
        {formatCount(score.correct + score.almost)} de {formatCount(score.total)} correctas
        {score.almost > 0 && ` (${formatCount(score.almost)} con un error de escritura)`}
      </p>
      <Badge tone="accent-soft" className="mt-3 animate-pop px-3 py-1 text-sm">
        +{formatCount(xp)} XP
      </Badge>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{detail}</p>
      {breakdown && breakdown.length > 1 && (
        <div className="mt-6 text-left">
          <h3 className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">Por destrezas</h3>
          <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {breakdown.map((skill) => (
              <div key={skill.skill} className="rounded-2xl border border-line bg-bg px-4 py-3">
                <dt className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{SKILL_LABEL[skill.skill]}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {skill.correct}/{skill.total}
                  </span>
                </dt>
                <dd className="mt-2 flex items-center gap-2.5">
                  <span
                    role="progressbar"
                    aria-label={SKILL_LABEL[skill.skill]}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(skill.ratio * 100)}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
                  >
                    <span
                      className={cn(
                        'block h-full rounded-full transition-[width] duration-700',
                        skill.ratio >= EXAM_PASS ? 'bg-ok' : skill.ratio >= 0.6 ? 'bg-accent' : 'bg-bad',
                      )}
                      style={{ width: `${skill.ratio * 100}%` }}
                    />
                  </span>
                  <span className="w-11 text-right text-sm font-semibold tabular-nums">{pct(skill.ratio)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {missed.length > 0 && (
        <div className="mt-6 text-left">
          <h3 className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">Para repasar</h3>
          <ul className="mt-2 space-y-2">
            {missed.map(({ exercise }) => (
              <li
                key={`${exercise.type}:${missedLabel(exercise)}`}
                className="rounded-2xl border border-line bg-bg px-4 py-2.5 text-sm"
              >
                <span className="block text-muted">{missedLabel(exercise)}</span>
                <span lang="en" className="block font-semibold">
                  {correctAnswer(exercise)}
                </span>
                {exercise.explanation && (
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{exercise.explanation}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">{actions}</div>
    </Surface>
  )
}

// --- Quiz ---------------------------------------------------------------------------------------------

interface QuizProps {
  /** Nivel del quiz, o null para el mixto. */
  level: CourseLevelId | null
  onExit: () => void
}

type QuizPhase = { step: 'intro' } | { step: 'running' } | { step: 'done'; verdicts: Verdict[] }

/** Un quiz: preguntas al azar del nivel (o de todos), distintas en cada intento. */
export function QuizScreen({ level, onExit }: QuizProps) {
  const states = useAllCourseLevels()
  const progress = useCourseProgress()
  const resume = useResume()
  const [target] = useState<RunTarget>(() => ({ kind: 'quiz', level }))
  const [phase, setPhase] = useState<QuizPhase>({ step: 'intro' })
  const [attempt, setAttempt] = useState(0)
  // La semilla se fija al empezar cada intento: el quiz no cambia a mitad de camino (ni al retomarlo).
  const [seed, setSeed] = useState(() => runOf(getResume(), target)?.seed ?? quizSeed(Date.now(), 0))
  const [start, setStart] = useState<ReturnType<typeof validStart>>(null)
  const key: QuizKey = level ?? 'mixto'
  const name = level ? `Quiz ${courseLevelInfo(level).name}` : 'Quiz mixto'
  const back = level
    ? { label: `Nivel ${courseLevelInfo(level).name}`, onClick: onExit }
    : { label: 'Curso', onClick: onExit }
  const needed = level ? [states[COURSE_LEVELS.findIndex((info) => info.id === level)]] : states
  const pending = needed.find((state): state is Exclude<LevelState, { status: 'ready' }> => state.status !== 'ready')
  if (pending) {
    return (
      <Shell back={back}>
        <Pending state={pending} level={level ?? 'a1'} />
      </Shell>
    )
  }
  const ready = needed.flatMap((state) => (state.status === 'ready' ? [state.level] : []))
  const build = (from: number) =>
    level
      ? buildQuiz(quizPool(ready[0]), from)
      : buildMixedQuiz(
          ready.filter((entry) => entry.lessons.length > 0),
          from,
        )
  const exercises = build(seed)
  const previous = progress.quizzes[key]
  const saved = runOf(resume, target)
  const resumable = saved?.seed === seed ? savedStart(saved, exercises.length) : null

  function begin(next: number) {
    const fresh = quizSeed(Date.now(), next)
    setAttempt(next)
    setSeed(fresh)
    setStart(null)
    saveRun(target, { step: 'practice', index: 0, verdicts: [], seed: fresh })
    setPhase({ step: 'running' })
  }

  function resumeSaved() {
    setStart(resumable)
    setPhase({ step: 'running' })
  }

  function finish(verdicts: Verdict[]) {
    const score = scoreOf(verdicts)
    recordQuiz(key, score.correct + score.almost, score.ratio)
    clearRun(target)
    feedback(score.ratio >= 0.7 ? 'goal' : 'wrong')
    setPhase({ step: 'done', verdicts })
    window.scrollTo({ top: 0 })
  }

  return (
    <Shell back={back}>
      <p className="mt-4 text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
        {level ? `Nivel ${courseLevelInfo(level).name}` : 'Todos los niveles'}
      </p>
      <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">{name}</h1>

      {phase.step === 'intro' && (
        <Surface className="mt-6 px-6 py-8 text-center sm:px-9">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent-soft text-accent">
            <BoltIcon width={30} height={30} />
          </span>
          <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
            {plural(exercises.length, 'pregunta')} al azar
            {level ? ' de las lecciones y el examen de este nivel' : ' de todos los niveles'}, distintas cada vez. Un
            quiz sin fallos da {XP_QUIZ_PERFECT} XP extra.
            {previous && ` Tu mejor nota: ${pct(previous.best)}.`}
          </p>
          <div className="mt-7 flex flex-col items-center gap-2">
            {resumable ? (
              <>
                <Button variant="primary" size="lg" onClick={resumeSaved}>
                  Continuar el quiz · {resumable.index + 1} de {exercises.length}
                  <Kbd tone="accent">Enter</Kbd>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => begin(attempt + 1)}>
                  Uno nuevo
                </Button>
              </>
            ) : (
              <Button variant="primary" size="lg" onClick={() => begin(attempt)}>
                Empezar el quiz
                <Kbd tone="accent">Enter</Kbd>
              </Button>
            )}
          </div>
        </Surface>
      )}

      {phase.step === 'running' && (
        <div className="mt-6">
          <ExerciseRunner
            key={seed}
            exercises={exercises}
            label={name}
            initial={start}
            onProgress={(index, verdicts) => saveRun(target, { step: 'practice', index, verdicts, seed })}
            onFinish={finish}
          />
        </div>
      )}

      {phase.step === 'done' && (
        <Result
          title={scoreOf(phase.verdicts).ratio >= 1 ? '¡Quiz perfecto!' : 'Quiz terminado'}
          verdicts={phase.verdicts}
          exercises={exercises}
          xp={
            (scoreOf(phase.verdicts).correct + scoreOf(phase.verdicts).almost) * XP_EXERCISE +
            (scoreOf(phase.verdicts).ratio >= 1 ? XP_QUIZ_PERFECT : 0)
          }
          detail="Cada quiz trae preguntas distintas: repetirlo es la forma más rápida de repasar."
          celebrate={scoreOf(phase.verdicts).ratio >= 0.7}
          actions={
            <>
              <Button size="lg" onClick={onExit}>
                {back.label}
              </Button>
              <Button variant="primary" size="lg" onClick={() => begin(attempt + 1)}>
                Otro quiz
                <Kbd tone="accent">Enter</Kbd>
              </Button>
            </>
          }
          onEnter={() => begin(attempt + 1)}
          onExit={onExit}
        />
      )}
    </Shell>
  )
}
