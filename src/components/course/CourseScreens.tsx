import { type ReactNode, useState } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { cn } from '@/lib/cn'
import {
  type CourseLevel,
  type Exercise,
  type Lesson,
  type LevelState,
  retryCourseLevel,
  useCourseLevel,
} from '@/lib/course'
import { COURSE_LEVELS, type CourseLevelId, courseLevelInfo, EXAM_PASS } from '@/lib/courseMeta'
import {
  examPassed,
  lessonKey,
  levelSummary,
  recordExam,
  recordLesson,
  useCourseProgress,
  XP_EXAM,
  XP_EXERCISE,
  XP_LESSON,
} from '@/lib/courseProgress'
import { correctAnswer, scoreOf, type Verdict } from '@/lib/exercises'
import { feedback } from '@/lib/feedback'
import { formatCount, plural } from '@/lib/format'
import { Confetti } from '../Confetti'
import { Header } from '../Header'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, GraduationIcon } from '../icons'
import { SpeakExampleButton } from '../SpeakExampleButton'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'
import { Surface } from '../ui/Surface'
import { ExerciseRunner } from './ExerciseRunner'

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
}

/** El curso: los seis niveles con su avance. */
export function CourseScreen({ onExit, onOpenLevel }: CourseProps) {
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
    </Shell>
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
                : `${summary.done} de ${summary.total} lecciones`}
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
}

export function LevelScreen({ level, onExit, onOpenLesson, onOpenExam }: LevelProps) {
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
        <LevelContent level={state.level} progress={progress} onOpenLesson={onOpenLesson} onOpenExam={onOpenExam} />
      )}
    </Shell>
  )
}

function LevelContent({
  level,
  progress,
  onOpenLesson,
  onOpenExam,
}: {
  level: CourseLevel
  progress: ReturnType<typeof useCourseProgress>
  onOpenLesson: (lesson: string) => void
  onOpenExam: () => void
}) {
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
        Lecciones · {summary.done} de {summary.total}
      </h2>
      <ol className="space-y-2.5">
        {level.lessons.map((lesson, index) => {
          const attempt = progress.lessons[lessonKey(level.id, lesson.id)]
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => onOpenLesson(lesson.id)}
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left shadow-card',
                  'transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-key-hover',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums',
                    attempt ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent',
                  )}
                >
                  {attempt ? <CheckCircleIcon width={18} height={18} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{lesson.title}</span>
                  <span className="block text-[13px] leading-snug text-muted">{lesson.summary}</span>
                  {attempt && (
                    <span className="mt-0.5 block text-[11px] text-ok tabular-nums">
                      Mejor nota: {pct(attempt.best)}
                    </span>
                  )}
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
  const [phase, setPhase] = useState<Phase>({ step: 'read' })
  const progress = useCourseProgress()
  const attempt = progress.lessons[lessonKey(level, lesson.id)]

  function finish(verdicts: Verdict[]) {
    const score = scoreOf(verdicts)
    const first = attempt === undefined
    recordLesson(level, lesson.id, score.correct + score.almost, score.ratio)
    feedback('goal')
    setPhase({ step: 'done', verdicts, first })
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <p className="mt-4 text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
        Lección {number} de {total}
      </p>
      <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">{lesson.title}</h1>
      <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted">{lesson.summary}</p>

      {phase.step === 'read' && (
        <>
          {lesson.sections.map((section) => (
            <Surface as="section" key={section.heading} className="mt-5 px-5 py-5 sm:px-6">
              <h2 className="text-[19px] font-semibold">{section.heading}</h2>
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
          ))}
          <div className="mt-6 flex flex-col items-center gap-2">
            <Button variant="primary" size="lg" onClick={() => setPhase({ step: 'practice' })}>
              Practicar · {plural(lesson.exercises.length, 'ejercicio')}
            </Button>
            {attempt && (
              <p className="text-xs text-muted">Ya la hiciste con un {pct(attempt.best)}. Repetirla afianza.</p>
            )}
          </div>
        </>
      )}

      {phase.step === 'practice' && (
        <div className="mt-6">
          <ExerciseRunner exercises={lesson.exercises} label={`Lección ${number}`} onFinish={finish} />
        </div>
      )}

      {phase.step === 'done' && (
        <Result
          title="¡Lección completada!"
          verdicts={phase.verdicts}
          exercises={lesson.exercises}
          xp={
            scoreOf(phase.verdicts).correct * XP_EXERCISE +
            scoreOf(phase.verdicts).almost * XP_EXERCISE +
            (phase.first ? XP_LESSON : 0)
          }
          detail={phase.first ? `Primera vez: +${XP_LESSON} XP por terminarla.` : 'Repetir afianza lo aprendido.'}
          actions={
            <>
              <Button size="lg" onClick={() => setPhase({ step: 'read' })}>
                Repasar la lección
              </Button>
              <Button variant="primary" size="lg" onClick={onNext}>
                {nextLabel}
                <Kbd tone="accent">Enter</Kbd>
              </Button>
            </>
          }
          onEnter={onNext}
          onExit={onExit}
        />
      )}
    </>
  )
}

// --- Examen ----------------------------------------------------------------------------------------

interface ExamProps {
  level: CourseLevelId
  onExit: () => void
}

type ExamPhase = { step: 'intro' } | { step: 'running' } | { step: 'done'; verdicts: Verdict[]; passed: boolean }

export function ExamScreen({ level, onExit }: ExamProps) {
  const info = courseLevelInfo(level)
  const state = useCourseLevel(level)
  const progress = useCourseProgress()
  const [phase, setPhase] = useState<ExamPhase>({ step: 'intro' })
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

  function finish(verdicts: Verdict[]) {
    const score = scoreOf(verdicts)
    const passed = recordExam(level, score.correct + score.almost, score.ratio)
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
          <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
            {plural(exam.length, 'pregunta')} de todo el nivel, sin pistas. Se aprueba con el {pct(EXAM_PASS)}.
            {previous && ` Tu mejor nota: ${pct(previous.best)}.`}
          </p>
          <Button variant="primary" size="lg" onClick={() => setPhase({ step: 'running' })} className="mt-7">
            Empezar el examen
          </Button>
        </Surface>
      )}

      {phase.step === 'running' && (
        <div className="mt-6">
          <ExerciseRunner exercises={exam} label={`Examen ${info.name}`} onFinish={finish} />
        </div>
      )}

      {phase.step === 'done' && (
        <Result
          title={phase.passed ? `¡Nivel ${info.name} aprobado!` : 'Esta vez no, pero casi'}
          verdicts={phase.verdicts}
          exercises={exam}
          xp={
            (scoreOf(phase.verdicts).correct + scoreOf(phase.verdicts).almost) * XP_EXERCISE +
            (phase.passed && !(previous && previous.best >= EXAM_PASS) ? XP_EXAM : 0)
          }
          detail={
            phase.passed
              ? 'Ya puedes pasar al siguiente nivel. Repetir el examen afianza lo aprendido.'
              : `Repasa las lecciones de lo que fallaste y vuelve a intentarlo: se aprueba con el ${pct(EXAM_PASS)}.`
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

// --- Resultado ---------------------------------------------------------------------------------------

function Result({
  title,
  verdicts,
  exercises,
  xp,
  detail,
  celebrate = true,
  actions,
  onEnter,
}: {
  title: string
  verdicts: Verdict[]
  exercises: readonly Exercise[]
  xp: number
  detail: string
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
      {missed.length > 0 && (
        <div className="mt-6 text-left">
          <h3 className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">Para repasar</h3>
          <ul className="mt-2 space-y-2">
            {missed.map(({ exercise }) => (
              <li
                key={`${exercise.type}:${correctAnswer(exercise)}`}
                className="rounded-2xl border border-line bg-bg px-4 py-2.5 text-sm"
              >
                <span className="block text-muted">
                  {exercise.type === 'choice' || exercise.type === 'fill' ? exercise.prompt : exercise.es}
                </span>
                <span lang="en" className="block font-semibold">
                  {correctAnswer(exercise)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center">{actions}</div>
    </Surface>
  )
}
