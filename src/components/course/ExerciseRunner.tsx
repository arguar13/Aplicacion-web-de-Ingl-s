import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { cn } from '@/lib/cn'
import type { Exercise } from '@/lib/course'
import { correctAnswer, judgeExercise, type Response, shuffledWords, type Verdict } from '@/lib/exercises'
import { feedback } from '@/lib/feedback'
import { formatCount } from '@/lib/format'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'
import { Surface } from '../ui/Surface'

interface Props {
  exercises: readonly Exercise[]
  /** Nombre de la tanda ("Lección 3" o "Examen A1"), para el lector de pantalla. */
  label: string
  onFinish: (verdicts: Verdict[]) => void
}

const TYPE_LABEL: Record<Exercise['type'], string> = {
  choice: 'Elige la opción correcta',
  fill: 'Completa el hueco',
  order: 'Ordena las palabras',
  translate: 'Traduce al inglés',
}

const VERDICT: Record<Verdict, { text: string; tone: string }> = {
  correct: { text: '¡Correcto!', tone: 'text-ok' },
  almost: { text: '¡Casi! Un pequeño error de escritura.', tone: 'text-ok' },
  wrong: { text: 'No es así.', tone: 'text-bad' },
}

/**
 * Una tanda de ejercicios, de uno en uno: se responde, se ve la corrección (con la respuesta
 * correcta y la explicación) y se continúa. Al terminar avisa con el resultado de cada uno.
 */
export function ExerciseRunner({ exercises, label, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [verdicts, setVerdicts] = useState<Verdict[]>([])
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const exercise = exercises[index]
  const continueButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (verdict) continueButton.current?.focus({ preventScroll: true })
  }, [verdict])

  function answer(response: Response) {
    if (verdict || !exercise) return
    const result = judgeExercise(exercise, response)
    feedback(result === 'wrong' ? 'wrong' : 'correct')
    setVerdict(result)
  }

  function next() {
    if (!verdict) return
    const all = [...verdicts, verdict]
    if (index + 1 >= exercises.length) {
      onFinish(all)
      return
    }
    setVerdicts(all)
    setVerdict(null)
    setIndex(index + 1)
  }

  useKeyDown((event) => {
    if (verdict && (event.key === 'Enter' || event.key === 'ArrowRight')) next()
  })

  if (!exercise) return null
  return (
    <Surface
      as="section"
      aria-label={`${label}: ejercicio ${index + 1} de ${exercises.length}`}
      className="px-5 pt-5 pb-5 sm:px-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          {TYPE_LABEL[exercise.type]}
        </span>
        <span className="text-xs text-muted tabular-nums">
          {formatCount(index + 1)} / {formatCount(exercises.length)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Avance de los ejercicios"
        aria-valuemin={0}
        aria-valuemax={exercises.length}
        aria-valuenow={index + (verdict ? 1 : 0)}
        className="mt-2 h-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${((index + (verdict ? 1 : 0)) / exercises.length) * 100}%` }}
        />
      </div>

      <div key={index} className="mt-5 animate-rise">
        {exercise.type === 'choice' && <Choice exercise={exercise} verdict={verdict} onAnswer={answer} />}
        {exercise.type === 'fill' && <Typed exercise={exercise} verdict={verdict} onAnswer={answer} />}
        {exercise.type === 'translate' && <Typed exercise={exercise} verdict={verdict} onAnswer={answer} />}
        {exercise.type === 'order' && <Order exercise={exercise} seed={index} verdict={verdict} onAnswer={answer} />}
      </div>

      <div aria-live="polite" className="mt-4 min-h-6">
        {verdict && (
          <div className="animate-rise">
            <p className={cn('text-sm font-medium', VERDICT[verdict].tone)}>{VERDICT[verdict].text}</p>
            {verdict !== 'correct' && (
              <p className="mt-1 text-[15px]">
                <span className="text-muted">Respuesta: </span>
                <span lang="en" className="font-semibold">
                  {correctAnswer(exercise)}
                </span>
              </p>
            )}
            {exercise.explanation && <p className="mt-1 text-[13px] leading-snug text-muted">{exercise.explanation}</p>}
          </div>
        )}
      </div>

      {verdict && (
        <div className="mt-4 flex justify-end">
          <Button ref={continueButton} variant="primary" size="lg" onClick={next} aria-keyshortcuts="Enter">
            {index + 1 >= exercises.length ? 'Ver el resultado' : 'Continuar'}
            <Kbd tone="accent">Enter</Kbd>
          </Button>
        </div>
      )}
    </Surface>
  )
}

interface PartProps<E extends Exercise> {
  exercise: E
  verdict: Verdict | null
  onAnswer: (response: Response) => void
}

/** La frase con el hueco, resaltado. */
function Blank({ prompt }: { prompt: string }) {
  const [before, after] = prompt.split('___')
  return (
    <p lang="en" className="text-xl leading-snug font-medium sm:text-2xl">
      {before}
      <span className="mx-1 inline-block w-[5ch] border-b-2 border-accent align-baseline" aria-label="hueco" />
      {after}
    </p>
  )
}

function Choice({ exercise, verdict, onAnswer }: PartProps<Extract<Exercise, { type: 'choice' }>>) {
  const [chosen, setChosen] = useState<number | null>(null)
  const pick = (option: number) => {
    if (verdict !== null) return
    setChosen(option)
    onAnswer(option)
  }
  useKeyDown((event) => {
    const option = Number(event.key) - 1
    if (verdict === null && option >= 0 && option < exercise.options.length) pick(option)
  })
  return (
    <>
      {exercise.prompt.includes('___') ? (
        <Blank prompt={exercise.prompt} />
      ) : (
        <p lang="en" className="text-xl leading-snug font-medium sm:text-2xl">
          {exercise.prompt}
        </p>
      )}
      <div role="group" aria-label="Opciones" className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {exercise.options.map((option, i) => {
          const state =
            verdict === null ? 'idle' : i === exercise.answer ? 'correct' : i === chosen ? 'wrong' : 'dimmed'
          return (
            <button
              key={option}
              type="button"
              lang="en"
              onClick={() => pick(i)}
              disabled={verdict !== null}
              aria-keyshortcuts={String(i + 1)}
              className={cn(
                'relative flex min-h-13 items-center justify-center rounded-2xl border px-4 py-3 text-center text-[16px] font-medium select-none',
                'transition-[translate,scale,box-shadow,background-color,border-color,color,opacity] duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                state === 'idle' &&
                  'cursor-pointer border-line bg-surface text-ink shadow-key hover:-translate-y-0.5 hover:border-accent/40 active:translate-y-0 active:scale-[0.98]',
                state === 'correct' && 'animate-pop border-ok bg-ok text-ok-ink',
                state === 'wrong' && 'animate-shake border-bad/40 bg-bad-soft text-bad',
                state === 'dimmed' && 'border-line bg-surface text-muted opacity-40',
              )}
            >
              <span
                aria-hidden
                className="absolute top-2 left-2.5 hidden size-5 items-center justify-center rounded-md bg-current/8 text-[11px] font-semibold tabular-nums opacity-70 pointer-fine:flex"
              >
                {i + 1}
              </span>
              {option}
            </button>
          )
        })}
      </div>
    </>
  )
}

function Typed({ exercise, verdict, onAnswer }: PartProps<Extract<Exercise, { type: 'fill' | 'translate' }>>) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])
  function submit(event: FormEvent) {
    event.preventDefault()
    if (text.trim()) onAnswer(text)
  }
  const label = exercise.type === 'fill' ? 'La palabra que falta' : 'La frase en inglés'
  return (
    <>
      {exercise.type === 'fill' ? (
        <Blank prompt={exercise.prompt} />
      ) : (
        <p lang="es" className="text-xl leading-snug font-medium sm:text-2xl">
          {exercise.es}
        </p>
      )}
      <form onSubmit={submit} className="mt-4 flex items-center gap-2.5">
        <label htmlFor="exercise-input" className="sr-only">
          {label}
        </label>
        <input
          ref={input}
          id="exercise-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={verdict !== null}
          lang="en"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize={exercise.type === 'fill' ? 'none' : 'sentences'}
          spellCheck={false}
          enterKeyHint="done"
          placeholder={exercise.type === 'fill' ? 'Escribe la palabra…' : 'Escribe la frase en inglés…'}
          className={cn(
            'h-12 min-w-0 flex-1 rounded-2xl border bg-raised px-4 text-[17px] text-ink outline-none placeholder:text-base placeholder:text-muted',
            'transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]',
            verdict === 'wrong' ? 'border-bad/50' : verdict ? 'border-ok/50' : 'border-line-strong',
          )}
        />
        {verdict === null && (
          <Button type="submit" variant="primary" size="lg" disabled={!text.trim()}>
            Comprobar
            <Kbd tone="accent">Enter</Kbd>
          </Button>
        )}
      </form>
    </>
  )
}

function Order({
  exercise,
  seed,
  verdict,
  onAnswer,
}: PartProps<Extract<Exercise, { type: 'order' }>> & { seed: number }) {
  // Las piezas se identifican por su posición en la baraja: una palabra repetida sigue siendo dos piezas.
  const [pool] = useState(() => shuffledWords(exercise.words, seed).map((word, i) => ({ id: i, word })))
  const [placed, setPlaced] = useState<number[]>([])
  const remaining = pool.filter((piece) => !placed.includes(piece.id))
  const place = (id: number) => {
    if (verdict !== null) return
    setPlaced((current) => [...current, id])
  }
  const undo = () => setPlaced((current) => current.slice(0, -1))
  const words = placed.map((id) => pool[id].word)
  useKeyDown((event) => {
    if (verdict !== null) return
    if (event.key === 'Backspace') return undo()
    if (event.key === 'Enter' && remaining.length === 0) return onAnswer(words)
    const piece = remaining[Number(event.key) - 1]
    if (piece) place(piece.id)
  })
  return (
    <>
      <p lang="es" className="text-xl leading-snug font-medium sm:text-2xl">
        {exercise.es}
      </p>
      <div
        role="group"
        aria-label="Tu frase"
        className={cn(
          'mt-4 flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border px-3 py-2',
          verdict === 'wrong'
            ? 'border-bad/50 bg-bad-soft/40'
            : verdict
              ? 'border-ok/50 bg-ok-soft/40'
              : 'border-line-strong bg-bg',
        )}
      >
        {words.length === 0 && <span className="text-sm text-muted">Toca las palabras en orden…</span>}
        {placed.map((id, i) => (
          <button
            key={id}
            type="button"
            lang="en"
            onClick={() => verdict === null && setPlaced((current) => current.filter((p) => p !== id))}
            disabled={verdict !== null}
            aria-label={`Quitar «${pool[id].word}» (posición ${i + 1})`}
            className="cursor-pointer rounded-xl border border-line bg-raised px-3 py-1.5 text-[16px] font-medium shadow-key transition-colors hover:border-bad/40 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default"
          >
            {pool[id].word}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Palabras disponibles" className="mt-3 flex flex-wrap gap-2">
        {remaining.map((piece, i) => (
          <button
            key={piece.id}
            type="button"
            lang="en"
            onClick={() => place(piece.id)}
            disabled={verdict !== null}
            aria-keyshortcuts={String(i + 1)}
            className="relative cursor-pointer rounded-xl border border-line bg-surface px-3 py-1.5 text-[16px] font-medium shadow-key transition-[translate,border-color] hover:-translate-y-0.5 hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default"
          >
            {piece.word}
          </button>
        ))}
      </div>
      {verdict === null && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" onClick={undo} disabled={placed.length === 0}>
            Deshacer
          </Button>
          <Button variant="primary" size="lg" onClick={() => onAnswer(words)} disabled={remaining.length > 0}>
            Comprobar
            <Kbd tone="accent">Enter</Kbd>
          </Button>
        </div>
      )}
    </>
  )
}
