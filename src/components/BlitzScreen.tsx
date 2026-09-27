import { useEffect, useRef, useState } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { BLITZ_MIN_WORDS, BLITZ_SECONDS, type BlitzRound, blitzDeck, blitzPool } from '@/lib/blitz'
import { cn } from '@/lib/cn'
import { feedback } from '@/lib/feedback'
import { formatCount, plural } from '@/lib/format'
import { getProgress, recordBlitzScore, recordPractice, useProgress } from '@/lib/progress'
import type { Word } from '@/lib/types'
import { Header, Stat } from './Header'
import { ArrowLeftIcon, BoltIcon } from './icons'
import { Keypad } from './Keypad'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'
import { Surface } from './ui/Surface'

/** Cuánto se ve el acierto o la respuesta correcta antes de la siguiente palabra. */
const FLASH_OK_MS = 180
const FLASH_WRONG_MS = 500
const DURATION_MS = BLITZ_SECONDS * 1000
/** Desde aquí la barra de tiempo avisa en rojo. */
const HURRY_MS = 10_000

type Phase = 'ready' | 'playing' | 'done'

/** Relámpago: 60 segundos, tantas palabras ya vistas como se pueda. */
export function BlitzScreen({ onExit }: { onExit: () => void }) {
  const [pool] = useState(() => blitzPool(getProgress()))
  if (pool.length < BLITZ_MIN_WORDS) return <NotEnoughWords seen={pool.length} onExit={onExit} />
  return <Blitz pool={pool} onExit={onExit} />
}

function Blitz({ pool, onExit }: { pool: readonly Word[]; onExit: () => void }) {
  const { blitzBest } = useProgress()
  const [phase, setPhase] = useState<Phase>('ready')
  // La baraja reparte rondas sin repetir palabra; cada partida empieza con una nueva.
  const [draw, setDraw] = useState(() => blitzDeck(pool))
  const [round, setRound] = useState<BlitzRound>(draw)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null)
  const [left, setLeft] = useState(DURATION_MS)
  const [newRecord, setNewRecord] = useState(false)
  const endsAt = useRef(0)
  // El recuento que se guarda al acabar: se lee dentro del bucle de la cuenta atrás.
  const result = useRef({ score: 0, answered: 0 })

  function start() {
    const fresh = blitzDeck(pool)
    setDraw(() => fresh)
    setRound(fresh())
    setScore(0)
    setAnswered(0)
    result.current = { score: 0, answered: 0 }
    setFlash(null)
    setNewRecord(false)
    setLeft(DURATION_MS)
    endsAt.current = performance.now() + DURATION_MS
    setPhase('playing')
  }

  // Cuenta atrás con requestAnimationFrame: la barra baja suave y el final llega a su hora.
  useEffect(() => {
    if (phase !== 'playing') return
    let frame = 0
    const tick = () => {
      const remaining = Math.max(0, endsAt.current - performance.now())
      setLeft(remaining)
      if (remaining > 0) {
        frame = requestAnimationFrame(tick)
        return
      }
      const { score: final, answered: total } = result.current
      recordPractice({ answers: total, clean: final, ms: DURATION_MS })
      setNewRecord(recordBlitzScore(final))
      setPhase('done')
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase])

  // Tras cada respuesta, un instante para ver el resultado y a la siguiente.
  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(
      () => {
        setFlash(null)
        setRound(draw())
      },
      flash.ok ? FLASH_OK_MS : FLASH_WRONG_MS,
    )
    return () => clearTimeout(timer)
  }, [flash, draw])

  function answer(id: string) {
    if (phase !== 'playing' || flash) return
    const ok = id === round.word.id
    feedback(ok ? 'correct' : 'wrong')
    result.current = { score: result.current.score + (ok ? 1 : 0), answered: result.current.answered + 1 }
    setAnswered(result.current.answered)
    setScore(result.current.score)
    setFlash({ id, ok })
  }

  useKeyDown((event) => {
    if (event.key === 'Escape') return onExit()
    if (phase !== 'playing') {
      if (event.key === 'Enter') {
        event.preventDefault()
        start()
      }
      return
    }
    const option = round.options[Number(event.key) - 1]
    if (option) answer(option.id)
  })

  const seconds = Math.ceil(left / 1000)
  const hurry = left <= HURRY_MS

  return (
    <>
      <Header>
        <Stat label="Récord" value={formatCount(blitzBest)} />
      </Header>
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 short:py-3">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl">
          <button
            type="button"
            onClick={onExit}
            className="mb-4 -ml-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent short:mb-2"
          >
            <ArrowLeftIcon width={16} height={16} />
            Niveles
          </button>
          {phase === 'ready' && (
            <Surface className="animate-rise px-6 py-10 text-center sm:px-9">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent-soft text-accent">
                <BoltIcon width={30} height={30} />
              </span>
              <h1 className="mt-5 font-display text-5xl">Relámpago</h1>
              <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
                {BLITZ_SECONDS} segundos para acertar todas las palabras que puedas, entre las{' '}
                {formatCount(pool.length)} que ya viste.
              </p>
              <Button variant="primary" size="lg" onClick={start} className="mt-8">
                Empezar
                <Kbd tone="accent">Enter</Kbd>
              </Button>
            </Surface>
          )}

          {phase === 'playing' && (
            <div className="flex flex-col gap-5 sm:gap-6">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className={cn('font-display text-4xl tabular-nums', hurry && 'text-bad')} aria-hidden>
                    {seconds}
                  </span>
                  <span className="text-sm text-muted">
                    <span className="font-display text-3xl text-ink tabular-nums">{score}</span> aciertos
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Tiempo restante"
                  aria-valuemin={0}
                  aria-valuemax={BLITZ_SECONDS}
                  aria-valuenow={seconds}
                  className="mt-2 h-2 overflow-hidden rounded-full bg-line"
                >
                  <div
                    className={cn('h-full rounded-full', hurry ? 'bg-bad' : 'bg-accent')}
                    style={{ width: `${(left / DURATION_MS) * 100}%` }}
                  />
                </div>
              </div>
              <Surface as="section" className="px-5 py-8 text-center sm:py-10">
                <h1
                  key={round.word.id}
                  lang="en"
                  className="animate-rise font-display text-6xl leading-none sm:text-7xl"
                >
                  {round.word.en}
                </h1>
              </Surface>
              <Keypad
                options={round.options}
                language="es"
                answerId={round.word.id}
                wrong={flash && !flash.ok ? [flash.id] : []}
                solved={flash !== null}
                onAnswer={answer}
              />
            </div>
          )}

          {phase === 'done' && (
            <Surface className="animate-rise px-6 py-10 text-center sm:px-9">
              <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">¡Tiempo!</p>
              <h1 className="mt-3 font-display text-7xl leading-none tabular-nums">{score}</h1>
              <p className="mt-2 text-[15px] text-muted">
                {plural(score, 'acierto')} de {plural(answered, 'palabra')}
              </p>
              {newRecord ? (
                <Badge tone="ok-soft" caps className="mt-4 animate-pop">
                  ¡Nuevo récord!
                </Badge>
              ) : (
                <p className="mt-4 text-sm text-muted">Tu récord: {formatCount(blitzBest)}</p>
              )}
              <div className="mt-8 flex flex-col-reverse justify-center gap-2.5 sm:flex-row">
                <Button size="lg" onClick={onExit}>
                  Volver
                </Button>
                <Button variant="primary" size="lg" onClick={start}>
                  Otra vez
                  <Kbd tone="accent">Enter</Kbd>
                </Button>
              </div>
            </Surface>
          )}
        </div>
      </main>
    </>
  )
}

function NotEnoughWords({ seen, onExit }: { seen: number; onExit: () => void }) {
  return (
    <>
      <Header />
      <main className="grid flex-1 place-items-center px-4 py-12 sm:px-6">
        <Surface className="w-full max-w-md animate-rise px-6 py-9 text-center sm:px-9">
          <h1 className="font-display text-4xl leading-tight">Aún no hay suficientes palabras</h1>
          <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
            Relámpago usa palabras que ya viste en traducir. Llevas {plural(seen, 'palabra')}; con {BLITZ_MIN_WORDS} ya
            puedes jugar.
          </p>
          <Button variant="primary" size="lg" onClick={onExit} className="mt-8">
            Volver a los niveles
          </Button>
        </Surface>
      </main>
    </>
  )
}
