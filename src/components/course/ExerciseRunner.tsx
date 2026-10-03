import { type FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { playPronunciation } from '@/lib/audio'
import { cn } from '@/lib/cn'
import type { Exercise } from '@/lib/course'
import { useRecordedSentence } from '@/lib/courseAudio'
import { bestEnglishVoice, canSpeak, speakEnglish, stopSpeaking } from '@/lib/tts'
import { correctAnswer, judgeExercise, optionOrder, type Response, shuffledWords, type Verdict } from '@/lib/exercises'
import { feedback } from '@/lib/feedback'
import { formatCount } from '@/lib/format'
import { SpeakerIcon } from '../icons'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'
import { Surface } from '../ui/Surface'

interface Props {
  exercises: readonly Exercise[]
  /** Nombre de la tanda ("Lección 3" o "Examen A1"), para el lector de pantalla. */
  label: string
  onFinish: (verdicts: Verdict[]) => void
  /** Retomar una tanda a medio hacer: el ejercicio en que se quedó y lo respondido hasta ahí. */
  initial?: { index: number; verdicts: Verdict[] } | null
  /** Tras cada ejercicio respondido y continuado: por dónde va (para poder retomarla). */
  onProgress?: (index: number, verdicts: Verdict[]) => void
}

const TYPE_LABEL: Record<Exercise['type'], string> = {
  choice: 'Elige la opción correcta',
  fill: 'Completa el hueco',
  order: 'Ordena las palabras',
  translate: 'Traduce al inglés',
  transform: 'Transforma la frase',
  spot: 'Encuentra el error',
  reading: 'Comprensión lectora',
  listening: 'Comprensión auditiva',
}

const VERDICT: Record<Verdict, { text: string; tone: string }> = {
  correct: { text: '¡Correcto!', tone: 'text-ok' },
  almost: { text: '¡Casi! Un pequeño error de escritura.', tone: 'text-ok' },
  wrong: { text: 'No es así.', tone: 'text-bad' },
}

/** Un punto de partida guardado vale si cuadra con la tanda (el contenido pudo cambiar desde entonces). */
export const validStart = (initial: Props['initial'], total: number) =>
  initial && initial.index < total && initial.verdicts.length === initial.index ? initial : null

/**
 * Una tanda de ejercicios, de uno en uno: se responde, se ve la corrección (con la respuesta
 * correcta y la explicación) y se continúa. Al terminar avisa con el resultado de cada uno. Puede
 * empezar a mitad de camino (lo que se guardó al dejarla).
 */
export function ExerciseRunner({ exercises, label, onFinish, initial, onProgress }: Props) {
  const [start] = useState(() => validStart(initial, exercises.length))
  const [index, setIndex] = useState(start?.index ?? 0)
  const [verdicts, setVerdicts] = useState<Verdict[]>(start?.verdicts ?? [])
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
    onProgress?.(index + 1, all)
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
        {exercise.type === 'transform' && <Typed exercise={exercise} verdict={verdict} onAnswer={answer} />}
        {exercise.type === 'spot' && <Spot exercise={exercise} verdict={verdict} onAnswer={answer} />}
        {exercise.type === 'order' && <Order exercise={exercise} seed={index} verdict={verdict} onAnswer={answer} />}
        {(exercise.type === 'reading' || exercise.type === 'listening') && (
          <Passage exercise={exercise} verdict={verdict} onAnswer={answer} />
        )}
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
  const order = useMemo(() => optionOrder(exercise.options, exercise.prompt), [exercise])
  const pick = (option: number) => {
    if (verdict !== null) return
    setChosen(option)
    onAnswer(option)
  }
  useKeyDown((event) => {
    const option = order[Number(event.key) - 1]
    if (verdict === null && option !== undefined) pick(option)
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
        {order.map((i, position) => {
          const option = exercise.options[i]
          const state =
            verdict === null ? 'idle' : i === exercise.answer ? 'correct' : i === chosen ? 'wrong' : 'dimmed'
          return (
            <button
              key={option}
              type="button"
              lang="en"
              onClick={() => pick(i)}
              disabled={verdict !== null}
              aria-keyshortcuts={String(position + 1)}
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
                {position + 1}
              </span>
              {option}
            </button>
          )
        })}
      </div>
    </>
  )
}

const TYPED_TEXT: Record<'fill' | 'translate' | 'transform', { label: string; placeholder: string }> = {
  fill: { label: 'La palabra que falta', placeholder: 'Escribe la palabra…' },
  translate: { label: 'La frase en inglés', placeholder: 'Escribe la frase en inglés…' },
  transform: { label: 'Lo que falta, con la palabra clave', placeholder: 'Entre dos y cinco palabras…' },
}

function Typed({
  exercise,
  verdict,
  onAnswer,
}: PartProps<Extract<Exercise, { type: 'fill' | 'translate' | 'transform' }>>) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])
  function submit(event: FormEvent) {
    event.preventDefault()
    if (text.trim()) onAnswer(text)
  }
  const { label, placeholder } = TYPED_TEXT[exercise.type]
  return (
    <>
      {exercise.type === 'fill' && <Blank prompt={exercise.prompt} />}
      {exercise.type === 'translate' && (
        <p lang="es" className="text-xl leading-snug font-medium sm:text-2xl">
          {exercise.es}
        </p>
      )}
      {exercise.type === 'transform' && <Transform exercise={exercise} />}
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
          autoCapitalize={exercise.type === 'translate' ? 'sentences' : 'none'}
          spellCheck={false}
          enterKeyHint="done"
          placeholder={placeholder}
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

/**
 * Transformación: la frase original, la palabra clave (que no se puede cambiar) y la segunda frase
 * con el hueco. Es el formato de la parte 4 de los exámenes de Cambridge (B2 First, C1, C2).
 */
function Transform({ exercise }: { exercise: Extract<Exercise, { type: 'transform' }> }) {
  return (
    <>
      <p lang="en" className="rounded-2xl border border-line bg-bg px-4 py-3 text-[17px] leading-snug">
        {exercise.original}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        Usa la palabra
        <span lang="en" className="rounded-lg bg-brand px-2.5 py-0.5 font-semibold tracking-wide text-accent-ink">
          {exercise.keyword}
        </span>
        sin cambiarla, con dos a cinco palabras:
      </p>
      <div className="mt-3">
        <Blank prompt={exercise.prompt} />
      </div>
    </>
  )
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/**
 * Encontrar el error: la frase en partes subrayadas, cada una con su letra; se toca la que está mal.
 * Al corregir, la parte equivocada se tacha y aparece cómo va.
 */
function Spot({ exercise, verdict, onAnswer }: PartProps<Extract<Exercise, { type: 'spot' }>>) {
  const [chosen, setChosen] = useState<number | null>(null)
  const pieces = useMemo(
    () => exercise.parts.map((text, index) => ({ text, index, letter: LETTERS[index] })),
    [exercise],
  )
  const pick = (part: number) => {
    if (verdict !== null) return
    setChosen(part)
    onAnswer(part)
  }
  useKeyDown((event) => {
    const part = LETTERS.indexOf(event.key.toUpperCase())
    const digit = Number(event.key) - 1
    const index = part >= 0 ? part : digit
    if (verdict === null && index >= 0 && index < exercise.parts.length) pick(index)
  })
  return (
    <>
      <p className="text-sm text-muted">Una de las partes tiene un error. Tócala.</p>
      <p
        lang="en"
        role="group"
        aria-label="Partes de la frase"
        className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-3 text-xl leading-snug sm:text-2xl"
      >
        {pieces.map(({ text: part, index: i, letter }) => {
          const state = verdict === null ? 'idle' : i === exercise.answer ? 'error' : i === chosen ? 'wrong' : 'dimmed'
          return (
            <button
              // Cada parte tiene su letra: dos partes con el mismo texto siguen siendo distintas.
              key={letter}
              type="button"
              onClick={() => pick(i)}
              disabled={verdict !== null}
              aria-keyshortcuts={letter}
              aria-label={`${letter}: ${part}`}
              className={cn(
                'relative inline-flex flex-col items-center rounded-xl px-1.5 pt-0.5 pb-4 font-medium',
                'transition-[background-color,color,opacity] duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                state === 'idle' && 'cursor-pointer hover:bg-accent-soft',
                state === 'error' && 'bg-ok-soft text-ok',
                state === 'wrong' && 'animate-shake bg-bad-soft text-bad',
                state === 'dimmed' && 'opacity-50',
              )}
            >
              <span
                className={cn(
                  'border-b-2 decoration-2',
                  state === 'error' ? 'border-ok line-through' : state === 'wrong' ? 'border-bad' : 'border-accent',
                )}
              >
                {part}
              </span>
              <span aria-hidden className="absolute bottom-0 text-[10px] font-semibold tracking-wide text-muted">
                {letter}
              </span>
            </button>
          )
        })}
      </p>
      {verdict !== null && (
        <p className="mt-3 animate-rise text-[15px]">
          <span className="text-muted">Lo correcto: </span>
          <span lang="en" className="font-semibold text-ok">
            {exercise.correction}
          </span>
        </p>
      )}
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

/** Avisa cuando el navegador termina de cargar sus voces. */
function subscribeVoices(listener: () => void) {
  if (!canSpeak()) return () => undefined
  window.speechSynthesis.addEventListener('voiceschanged', listener)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', listener)
}
const hasEnglishVoice = () => bestEnglishVoice() !== null

/**
 * Comprensión lectora o auditiva: un texto (a la vista, o solo de oído) y sus preguntas. En la
 * auditiva, si no hay grabación ni voz en el navegador, el texto se muestra: mejor leer que no
 * poder responder. La transcripción se destapa al corregir.
 */
function Passage({ exercise, verdict, onAnswer }: PartProps<Extract<Exercise, { type: 'reading' | 'listening' }>>) {
  const [chosen, setChosen] = useState<Array<number | null>>(() => exercise.questions.map(() => null))
  const recorded = useRecordedSentence(exercise.text)
  const voice = useSyncExternalStore(subscribeVoices, hasEnglishVoice, () => false)
  const canHear = recorded !== null || voice
  const listening = exercise.type === 'listening' && canHear
  const showText = exercise.type === 'reading' || !canHear || verdict !== null
  const complete = chosen.every((option) => option !== null)
  useEffect(() => () => stopSpeaking(), [])

  const play = () => {
    if (recorded) void playPronunciation(recorded)
    else speakEnglish(exercise.text)
  }
  const pick = (question: number, option: number) => {
    if (verdict !== null) return
    setChosen((current) => current.map((value, i) => (i === question ? option : value)))
  }
  useKeyDown((event) => {
    if (verdict === null && event.key === 'Enter' && complete) onAnswer(chosen.map((option) => option ?? -1))
  })

  return (
    <>
      <h3 lang="en" className="text-xl leading-snug font-semibold sm:text-2xl">
        {exercise.title}
      </h3>
      {listening && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-bg px-4 py-3">
          <button
            type="button"
            onClick={play}
            aria-label="Escuchar el audio"
            className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-accent-soft text-accent transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
          >
            <SpeakerIcon width={24} height={24} />
          </button>
          <p className="text-sm text-muted">
            {verdict === null
              ? 'Escucha las veces que quieras y responde. La transcripción aparece al corregir.'
              : 'Transcripción a la vista. Vuelve a escuchar si quieres.'}
          </p>
        </div>
      )}
      {showText && (
        <p
          lang="en"
          className={cn(
            'mt-3 rounded-2xl border border-line bg-bg px-4 py-3 text-[15px] leading-relaxed',
            exercise.type === 'listening' && verdict !== null && 'animate-rise',
          )}
        >
          {exercise.text}
        </p>
      )}
      {exercise.type === 'listening' && !canHear && verdict === null && (
        <p className="mt-2 text-xs text-muted">
          Este navegador no tiene voz en inglés: el texto se muestra para leerlo.
        </p>
      )}
      <ol className="mt-4 space-y-4">
        {exercise.questions.map((question, qi) => (
          <li key={question.prompt}>
            <PassageQuestion
              question={question}
              number={qi + 1}
              chosen={chosen[qi]}
              verdict={verdict}
              onPick={(option) => pick(qi, option)}
            />
          </li>
        ))}
      </ol>
      {verdict === null && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            disabled={!complete}
            onClick={() => onAnswer(chosen.map((option) => option ?? -1))}
          >
            Comprobar
            <Kbd tone="accent">Enter</Kbd>
          </Button>
        </div>
      )}
    </>
  )
}

/** Una pregunta de comprensión, con sus opciones en un orden estable (ver optionOrder). */
function PassageQuestion({
  question,
  number,
  chosen,
  verdict,
  onPick,
}: {
  question: { prompt: string; options: string[]; answer: number }
  number: number
  chosen: number | null
  verdict: Verdict | null
  onPick: (option: number) => void
}) {
  const order = useMemo(() => optionOrder(question.options, question.prompt), [question])
  return (
    <fieldset>
      <legend lang="en" className="text-[15px] font-medium">
        {number}. {question.prompt}
      </legend>
      <div role="group" aria-label={`Pregunta ${number}`} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {order.map((oi) => {
          const option = question.options[oi]
          const state =
            verdict === null
              ? chosen === oi
                ? 'chosen'
                : 'idle'
              : oi === question.answer
                ? 'correct'
                : chosen === oi
                  ? 'wrong'
                  : 'dimmed'
          return (
            <button
              key={option}
              type="button"
              lang="en"
              onClick={() => onPick(oi)}
              disabled={verdict !== null}
              aria-pressed={chosen === oi}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-[15px] transition-[background-color,border-color,color,opacity] duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                state === 'idle' && 'cursor-pointer border-line bg-surface hover:border-accent/40',
                state === 'chosen' && 'cursor-pointer border-accent bg-accent-soft text-accent',
                state === 'correct' && 'border-ok bg-ok-soft text-ok',
                state === 'wrong' && 'border-bad/40 bg-bad-soft text-bad',
                state === 'dimmed' && 'border-line bg-surface text-muted opacity-50',
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
