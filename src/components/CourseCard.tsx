import { useCourseLevel } from '@/lib/course'
import { cn } from '@/lib/cn'
import { COURSE_LEVELS, type CourseLevelId, courseLevelInfo } from '@/lib/courseMeta'
import { examPassed, lessonKey, nextStep, useCourseProgress } from '@/lib/courseProgress'
import { runOf, useResume } from '@/lib/resume'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ArrowRightIcon, GraduationIcon } from './icons'

interface Props {
  onOpenCourse: () => void
  onOpenLesson: (level: CourseLevelId, lesson: string) => void
  onOpenExam: (level: CourseLevelId) => void
  onOpenQuiz: (level: CourseLevelId | null) => void
}

/**
 * El curso en el inicio: el nivel en que se va y el siguiente paso (la lección que toca o el
 * examen). Solo carga el contenido del nivel en curso.
 */
export function CourseCard({ onOpenCourse, onOpenLesson, onOpenExam, onOpenQuiz }: Props) {
  const progress = useCourseProgress()
  const current = COURSE_LEVELS.find((level) => !examPassed(progress, level.id)) ?? null
  const state = useCourseLevel(current?.id ?? 'a1')
  const step =
    current && state.status === 'ready' ? nextStep(progress, [{ id: current.id, lessons: state.level.lessons }]) : null
  const passed = COURSE_LEVELS.filter((level) => examPassed(progress, level.id)).length
  // La lección que toca, si se dejó a medias o si ya se intentó sin superarla.
  const resume = useResume()
  const lesson = current && step?.lesson ? step.lesson : null
  const run = current && lesson ? runOf(resume, { kind: 'lesson', level: current.id, lesson: lesson.id }) : null
  const midway = run?.step === 'practice' && run.index > 0 ? run.index : null
  const tried = current && lesson ? progress.lessons[lessonKey(current.id, lesson.id)] : undefined
  const lessonTotal =
    state.status === 'ready' && lesson ? (state.level.lessons[lesson.index]?.exercises.length ?? null) : null

  return (
    <section
      aria-labelledby="curso-de-ingles"
      className="h-full animate-rise rounded-3xl border border-line bg-surface spotlight p-5 shadow-card sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="curso-de-ingles" className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
            Curso de inglés · A1 a C2
          </h2>
          <p className="mt-1.5 text-[17px] font-semibold">
            {current === null
              ? '¡Curso completo! Los seis niveles aprobados.'
              : step?.lesson
                ? `Nivel ${current.name}: lección ${step.lesson.index + 1}, ${step.lesson.title}`
                : step
                  ? `Nivel ${current.name}: te espera el examen`
                  : `Nivel ${current.name} · ${courseLevelInfo(current.id).title}`}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {midway !== null
              ? `Te quedaste en el ejercicio ${midway + 1}${lessonTotal ? ` de ${lessonTotal}` : ''}.`
              : tried
                ? `Tu mejor nota: ${Math.round(tried.best * 100)} %. Repítela para superarla.`
                : passed > 0
                  ? `${passed} de ${COURSE_LEVELS.length} niveles aprobados`
                  : 'Lecciones con explicación y ejercicios; un examen por nivel.'}
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <GraduationIcon />
        </span>
      </div>
      <ol className="mt-4 flex gap-1.5" aria-label="Niveles">
        {COURSE_LEVELS.map((level) => {
          const done = examPassed(progress, level.id)
          return (
            <li key={level.id} className="flex-1">
              <span
                className={cn(
                  'block h-1.5 rounded-full',
                  done ? 'bg-ok' : level.id === current?.id ? 'bg-accent' : 'bg-line',
                )}
              />
              <span
                className={cn(
                  'mt-1 block text-center text-[10px] font-semibold',
                  done ? 'text-ok' : level.id === current?.id ? 'text-accent' : 'text-muted',
                )}
              >
                {level.name}
                {done && <span className="sr-only"> aprobado</span>}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {current && lesson && (
          <Button variant="primary" onClick={() => onOpenLesson(current.id, lesson.id)}>
            {midway !== null ? 'Continuar donde lo dejaste' : tried ? 'Repetir la lección' : 'Seguir con la lección'}
            <ArrowRightIcon width={16} height={16} />
          </Button>
        )}
        {current && step && !step.lesson && (
          <Button variant="primary" onClick={() => onOpenExam(current.id)}>
            Hacer el examen {current.name}
            <ArrowRightIcon width={16} height={16} />
          </Button>
        )}
        <Button variant={current && step ? 'secondary' : 'primary'} onClick={onOpenCourse}>
          Ver el curso
        </Button>
        <Button variant="ghost" onClick={() => onOpenQuiz(current?.id ?? null)}>
          {current ? `Quiz ${current.name}` : 'Quiz mixto'}
        </Button>
        {current && state.status === 'loading' && <Badge tone="accent-soft">Cargando…</Badge>}
      </div>
    </section>
  )
}
