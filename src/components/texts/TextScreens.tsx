/**
 * Textos para entrenar el oído y la pronunciación: la biblioteca, «Escucha el texto» (lo lee la voz
 * neuronal frase a frase, con la traducción a un toque) y «Léelo en voz alta» (el micrófono te
 * escucha y marca cada palabra que se entiende). Una sola pantalla diferida: se carga al abrirla.
 */
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { playPronunciation, playToEnd, stopPlayback } from '@/lib/audio'
import { cn } from '@/lib/cn'
import { recordedIdOf } from '@/lib/courseAudio'
import { COURSE_LEVELS, type CourseLevelId, courseLevelInfo } from '@/lib/courseMeta'
import { examPassed, useCourseProgress } from '@/lib/courseProgress'
import { ALL_WORDS } from '@/lib/decks'
import { feedback } from '@/lib/feedback'
import { plural } from '@/lib/format'
import { alignSpoken, heardWords, SENTENCE_PASS, spokenScore, type TargetWord, targetWords } from '@/lib/readAloud'
import type { TextMode } from '@/lib/routes'
import { canRecognizeSpeech, startDictation } from '@/lib/speech'
import { levelInProgress, PROGRAMS, recommendText, usePlan } from '@/lib/studyPlan'
import {
  recordListened,
  recordSpoken,
  SPOKEN_PASS,
  spokenPassed,
  type TextProgress,
  useTextProgress,
  XP_LISTEN_AGAIN,
  XP_LISTEN_FIRST,
} from '@/lib/textProgress'
import {
  listeningMinutes,
  retryTexts,
  type Sentence,
  sentencesOf,
  type StudyText,
  type TextsState,
  useTexts,
} from '@/lib/texts'
import { speakEnglish, speakToEnd, stopSpeaking } from '@/lib/tts'
import { ArrowRightIcon, CheckCircleIcon, HeadphonesIcon, MicIcon, SlowIcon, SpeakerIcon } from '../icons'
import {
  EyeIcon,
  EyeOffIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  RepeatIcon,
  TranslationIcon,
} from '../mediaIcons'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Kbd } from '../ui/Kbd'
import { PageShell } from '../ui/PageShell'
import { Surface } from '../ui/Surface'

const MODE: Record<TextMode, { title: string; lead: string; action: string; Icon: typeof HeadphonesIcon }> = {
  listen: {
    title: 'Entrena el oído',
    lead: 'Escucha textos completos con voz nativa, frase a frase. Primero solo con el oído; cuando quieras, mira el texto y su traducción al español.',
    action: 'Escuchar',
    Icon: HeadphonesIcon,
  },
  read: {
    title: 'Lee en voz alta',
    lead: 'Lee el texto con tu voz, frase a frase: el micrófono te escucha y marca en verde cada palabra que se entiende. Escucha el modelo cuando lo necesites.',
    action: 'Leer en voz alta',
    Icon: MicIcon,
  },
}

/** Pausa entre frase y frase al escuchar un texto: el oído necesita un respiro. */
const GAP_MS = 450
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const pct = (ratio: number) => `${Math.round(ratio * 100)} %`

const isDone = (progress: TextProgress, mode: TextMode, id: string) =>
  mode === 'listen' ? id in progress.listened : spokenPassed(progress, id)

/** Corta lo que esté sonando, venga de una grabación o de la voz del navegador. */
function silence() {
  stopPlayback()
  stopSpeaking()
}

/**
 * Lee una frase: con su grabación si la tiene; si no (o no se pudo cargar), con la voz del
 * navegador. `stillCurrent` dice si mientras tanto se pidió otra cosa (entonces no hay que seguir).
 */
async function sayOnce(text: string, slow: boolean, stillCurrent: () => boolean): Promise<boolean> {
  const recorded = await recordedIdOf(text).catch(() => null)
  if (!stillCurrent()) return false
  if (recorded && (await playToEnd(recorded, { slow }))) return true
  if (!stillCurrent()) return false
  return speakToEnd(text, { slow })
}

// --- Biblioteca ----------------------------------------------------------------------------------

interface LibraryProps {
  mode: TextMode
  onExit: () => void
  onOpenText: (mode: TextMode, id: string) => void
  onSwitchMode: (mode: TextMode) => void
}

/** La biblioteca de textos, en modo escuchar o leer en voz alta, con uno recomendado arriba. */
export function TextLibraryScreen({ mode, onExit, onOpenText, onSwitchMode }: LibraryProps) {
  const state = useTexts()
  const progress = useTextProgress()
  const course = useCourseProgress()
  const plan = usePlan()
  const [filter, setFilter] = useState<CourseLevelId | 'all'>('all')
  const info = MODE[mode]
  const level = levelInProgress((id) => examPassed(course, id), plan)

  return (
    <PageShell back={{ label: 'Inicio', onClick: onExit }} wide>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Escucha y habla</p>
          <h1 className="mt-2 font-display text-5xl leading-none">{info.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{info.lead}</p>
        </div>
        <ModeSwitch mode={mode} onSwitch={onSwitchMode} />
      </div>

      <Loaded state={state}>
        {(texts) => {
          const done = texts.filter((text) => isDone(progress, mode, text.id)).length
          const topics = plan ? PROGRAMS[plan.program].textTopics : []
          const recommended = recommendText(texts, level, (id) => isDone(progress, mode, id), topics)
          const visible = filter === 'all' ? texts : texts.filter((text) => text.level === filter)
          return (
            <>
              {recommended && (
                <RecommendedCard
                  text={recommended}
                  mode={mode}
                  done={done}
                  total={texts.length}
                  onOpen={() => onOpenText(mode, recommended.id)}
                />
              )}
              <LevelFilter value={filter} onChange={setFilter} />
              {COURSE_LEVELS.filter((entry) => visible.some((text) => text.level === entry.id)).map((entry) => (
                <section key={entry.id} aria-labelledby={`textos-${entry.id}`} className="mt-8">
                  <h2 id={`textos-${entry.id}`} className="flex items-baseline gap-2.5">
                    <span className="text-brand font-display text-2xl">{entry.name}</span>
                    <span className="text-sm font-semibold">{entry.title}</span>
                  </h2>
                  <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visible
                      .filter((text) => text.level === entry.id)
                      .map((text) => (
                        <li key={text.id}>
                          <TextCard
                            text={text}
                            mode={mode}
                            progress={progress}
                            onOpen={() => onOpenText(mode, text.id)}
                          />
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </>
          )
        }}
      </Loaded>
    </PageShell>
  )
}

/** Escuchar o leer en voz alta: los dos modos de la biblioteca. */
function ModeSwitch({ mode, onSwitch }: { mode: TextMode; onSwitch: (mode: TextMode) => void }) {
  return (
    <div
      role="group"
      aria-label="Modo"
      className="inline-flex rounded-full border border-line bg-surface p-1 shadow-key"
    >
      {(['listen', 'read'] as const).map((option) => {
        const { Icon, title } = MODE[option]
        const active = option === mode
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => !active && onSwitch(option)}
            className={cn(
              'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              active ? 'bg-brand text-accent-ink shadow-glow' : 'text-muted hover:text-ink',
            )}
          >
            <Icon width={16} height={16} />
            {title}
          </button>
        )
      })}
    </div>
  )
}

function LevelFilter({
  value,
  onChange,
}: {
  value: CourseLevelId | 'all'
  onChange: (value: CourseLevelId | 'all') => void
}) {
  const options = [{ id: 'all' as const, name: 'Todos' }, ...COURSE_LEVELS]
  return (
    <div role="group" aria-label="Nivel" className="mt-8 flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'h-9 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            value === option.id
              ? 'border-transparent bg-ink text-bg'
              : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
          )}
        >
          {option.name}
        </button>
      ))}
    </div>
  )
}

function RecommendedCard({
  text,
  mode,
  done,
  total,
  onOpen,
}: {
  text: StudyText
  mode: TextMode
  done: number
  total: number
  onOpen: () => void
}) {
  const { Icon, action } = MODE[mode]
  return (
    <Surface className="relative mt-8 overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-accent-soft blur-3xl"
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">
            Recomendado para ti · {courseLevelInfo(text.level).name}
          </p>
          <p lang="en" className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
            {text.title}
          </p>
          <p className="mt-1 text-[15px] text-muted">
            {text.titleEs} · {text.topic} · {listeningMinutes(text)} min
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
          <Button variant="primary" size="lg" onClick={onOpen}>
            <Icon width={18} height={18} />
            {action}
          </Button>
          <p className="text-xs text-muted tabular-nums">
            {done} de {total} {mode === 'listen' ? 'escuchados' : 'leídos con buena nota'}
          </p>
        </div>
      </div>
    </Surface>
  )
}

function TextCard({
  text,
  mode,
  progress,
  onOpen,
}: {
  text: StudyText
  mode: TextMode
  progress: TextProgress
  onOpen: () => void
}) {
  const listened = progress.listened[text.id]
  const spoken = progress.spoken[text.id]
  const sentences = sentencesOf(text).length
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex h-full w-full cursor-pointer flex-col rounded-3xl border border-line bg-surface p-5 text-left shadow-card',
        'transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-key-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{text.topic}</span>
        {isDone(progress, mode, text.id) && <CheckCircleIcon width={18} height={18} className="text-ok" />}
      </span>
      <span lang="en" className="mt-3 block text-[17px] leading-snug font-semibold">
        {text.title}
      </span>
      <span className="mt-0.5 block text-sm text-muted">{text.titleEs}</span>
      <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 text-xs text-muted tabular-nums">
        <span>{listeningMinutes(text)} min</span>
        <span>{plural(sentences, 'frase')}</span>
        {listened && <Badge tone="ok-soft">Escuchado{listened.times > 1 ? ` ×${listened.times}` : ''}</Badge>}
        {spoken && <Badge tone={spoken.best >= SPOKEN_PASS ? 'ok-soft' : 'accent-soft'}>Voz {pct(spoken.best)}</Badge>}
      </span>
    </button>
  )
}

/** Mientras llega la biblioteca, o si no se pudo cargar. */
function Loaded({ state, children }: { state: TextsState; children: (texts: StudyText[]) => ReactNode }) {
  if (state.status === 'ready') return children(state.texts)
  if (state.status === 'loading') {
    return (
      <div
        className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy
        aria-label="Cargando los textos"
      >
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-40 animate-pulse rounded-3xl bg-line/60" />
        ))}
      </div>
    )
  }
  return (
    <Surface className="mt-8 px-6 py-8 text-center">
      <p className="text-[15px] text-muted">
        No se pudieron cargar los textos. Si no tienes conexión, prueba cuando vuelva.
      </p>
      <Button variant="primary" onClick={retryTexts} className="mt-4">
        Reintentar
      </Button>
    </Surface>
  )
}

// --- Un texto ------------------------------------------------------------------------------------

interface TextProps {
  mode: TextMode
  id: string
  onExit: () => void
  onOpenText: (mode: TextMode, id: string) => void
}

/** Un texto, para escucharlo o leerlo en voz alta. */
export function TextScreen({ mode, id, onExit, onOpenText }: TextProps) {
  const state = useTexts()
  return (
    <PageShell back={{ label: 'Textos', onClick: onExit }}>
      <Loaded state={state}>
        {(texts) => {
          const index = texts.findIndex((text) => text.id === id)
          const text = texts[index]
          if (!text) {
            return (
              <Surface className="mt-6 px-6 py-8 text-center">
                <p className="text-[15px] text-muted">Este texto ya no está en la biblioteca.</p>
                <Button variant="primary" onClick={onExit} className="mt-4">
                  Ver los textos
                </Button>
              </Surface>
            )
          }
          const next = texts[(index + 1) % texts.length]
          const actions = {
            onSwitch: () => onOpenText(mode === 'listen' ? 'read' : 'listen', text.id),
            onNext: () => onOpenText(mode, next.id),
            nextTitle: next.title,
          }
          return mode === 'listen' ? (
            <ListenView key={text.id} text={text} {...actions} />
          ) : (
            <ReadView key={text.id} text={text} {...actions} />
          )
        }}
      </Loaded>
    </PageShell>
  )
}

interface ViewActions {
  onSwitch: () => void
  onNext: () => void
  nextTitle: string
}

function TextHeading({ text, mode }: { text: StudyText; mode: TextMode }) {
  const level = courseLevelInfo(text.level)
  return (
    <div className="mt-4">
      <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
        <Badge tone="accent-soft">{level.name}</Badge>
        {MODE[mode].title} · {text.topic} · {listeningMinutes(text)} min
      </p>
      <h1 lang="en" className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
        {text.title}
      </h1>
      <p className="mt-1 text-[15px] text-muted">{text.titleEs}</p>
    </div>
  )
}

/** Un interruptor de la barra (texto, traducción, despacio): un botón que se queda pulsado. */
function Toggle({
  pressed,
  onClick,
  label,
  shortcut,
  children,
}: {
  pressed: boolean
  onClick: () => void
  label: string
  shortcut?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-keyshortcuts={shortcut}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        pressed
          ? 'border-accent/40 bg-accent-soft text-accent'
          : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

// --- Escuchar ------------------------------------------------------------------------------------

function ListenView({ text, onSwitch, onNext, nextTitle }: { text: StudyText } & ViewActions) {
  const sentences = useMemo(() => sentencesOf(text), [text])
  const progress = useTextProgress()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [slow, setSlow] = useState(false)
  // Primero solo con el oído: el texto se descubre cuando se quiere.
  const [showText, setShowText] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [finished, setFinished] = useState<{ xp: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const run = useRef(0)
  const slowRef = useRef(slow)
  const heard = useRef(new Set<number>())
  const sentenceRefs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    slowRef.current = slow
  }, [slow])
  useEffect(
    () => () => {
      run.current++
      silence()
    },
    [],
  )
  useEffect(() => {
    if (playing) sentenceRefs.current[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [index, playing])

  async function playFrom(start: number) {
    const token = ++run.current
    silence()
    setPlaying(true)
    setFinished(null)
    setFailed(false)
    await playSentence(start, () => token === run.current)
  }

  /** Lee la frase `i` y, si nadie lo interrumpe, sigue con la siguiente; al final, cuenta el texto como escuchado. */
  async function playSentence(i: number, current: () => boolean): Promise<void> {
    if (i >= sentences.length) {
      setPlaying(false)
      // Escuchado entero (aunque fuese a trozos): cuenta una vez y se vuelve a empezar la cuenta.
      if (heard.current.size === sentences.length) {
        const first = !(text.id in progress.listened)
        recordListened(text.id)
        heard.current.clear()
        setFinished({ xp: first ? XP_LISTEN_FIRST : XP_LISTEN_AGAIN })
        feedback('goal')
      }
      return
    }
    setIndex(i)
    const ok = await sayOnce(sentences[i].en, slowRef.current, current)
    if (!current()) return
    if (!ok) {
      setPlaying(false)
      setFailed(true)
      return
    }
    heard.current.add(i)
    if (i < sentences.length - 1) await wait(GAP_MS)
    if (current()) await playSentence(i + 1, current)
  }

  function pause() {
    run.current++
    silence()
    setPlaying(false)
  }

  const toggle = () => (playing ? pause() : void playFrom(index >= sentences.length - 1 && finished ? 0 : index))
  function go(to: number) {
    const target = Math.min(Math.max(to, 0), sentences.length - 1)
    if (playing) void playFrom(target)
    else setIndex(target)
  }

  useKeyDown((event) => {
    if (event.key === ' ') {
      event.preventDefault()
      toggle()
    } else if (event.key === 'ArrowLeft') go(index - 1)
    else if (event.key === 'ArrowRight') go(index + 1)
    else if (event.key.toLowerCase() === 't') setShowTranslation((value) => !value)
    else if (event.key.toLowerCase() === 'v') setShowText((value) => !value)
    else if (event.key.toLowerCase() === 'l') setSlow((value) => !value)
  })

  return (
    <>
      <TextHeading text={text} mode="listen" />

      {!showText && !showTranslation && (
        <p className="mt-5 rounded-2xl border border-line bg-bg px-4 py-3 text-sm text-muted">
          Escucha sin leer: intenta entenderlo solo con el oído. Cuando quieras, muestra el texto o la traducción.
        </p>
      )}

      <article aria-label="Texto" className="mt-6 space-y-5">
        {text.paragraphs.map((paragraph, p) => {
          const offset = text.paragraphs.slice(0, p).reduce((sum, list) => sum + list.length, 0)
          return (
            <div key={offset} className="space-y-1.5">
              {paragraph.map((sentence, s) => {
                const i = offset + s
                return (
                  <SentenceRow
                    key={i}
                    ref={(element) => {
                      sentenceRefs.current[i] = element
                    }}
                    sentence={sentence}
                    number={i + 1}
                    active={i === index}
                    playing={playing && i === index}
                    showText={showText}
                    showTranslation={showTranslation}
                    onPlay={() => void playFrom(i)}
                  />
                )
              })}
            </div>
          )
        })}
      </article>

      {failed && (
        <p role="alert" className="mt-5 rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          No se pudo reproducir el audio. Revisa la conexión o el volumen y prueba de nuevo.
        </p>
      )}

      {finished && (
        <Surface className="mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
              <CheckCircleIcon />
            </span>
            <div>
              <p className="text-[17px] font-semibold">Texto escuchado entero</p>
              <p className="text-sm text-muted">+{finished.xp} XP · ahora léelo en voz alta para fijarlo.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNext} title={nextTitle}>
              Siguiente texto
            </Button>
            <Button variant="primary" onClick={onSwitch}>
              <MicIcon width={16} height={16} />
              Léelo en voz alta
            </Button>
          </div>
        </Surface>
      )}

      {/* La barra del reproductor queda a mano al desplazarse por el texto. */}
      <div className="sticky bottom-3 z-20 mt-8 rounded-3xl glass p-3 shadow-float sm:p-4">
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs text-muted tabular-nums">
            {index + 1} / {sentences.length}
          </span>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Frase"
            aria-valuemin={1}
            aria-valuemax={sentences.length}
            aria-valuenow={index + 1}
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${((index + 1) / sentences.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <IconButton label="Frase anterior" size="md" onClick={() => go(index - 1)} disabled={index === 0}>
              <PreviousIcon />
            </IconButton>
            <button
              type="button"
              onClick={toggle}
              aria-keyshortcuts="Space"
              aria-label={playing ? 'Pausar' : 'Escuchar'}
              className="grid size-14 cursor-pointer place-items-center rounded-full bg-brand text-accent-ink shadow-glow transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
            >
              {playing ? <PauseIcon width={22} height={22} /> : <PlayIcon width={22} height={22} />}
            </button>
            <IconButton
              label="Frase siguiente"
              size="md"
              onClick={() => go(index + 1)}
              disabled={index === sentences.length - 1}
            >
              <NextIcon />
            </IconButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle pressed={slow} onClick={() => setSlow(!slow)} label="Despacio" shortcut="L">
              <SlowIcon width={16} height={16} />
            </Toggle>
            <Toggle pressed={showText} onClick={() => setShowText(!showText)} label="Texto" shortcut="V">
              {showText ? <EyeIcon width={16} height={16} /> : <EyeOffIcon width={16} height={16} />}
            </Toggle>
            <Toggle
              pressed={showTranslation}
              onClick={() => setShowTranslation(!showTranslation)}
              label="Traducción"
              shortcut="T"
            >
              <TranslationIcon width={16} height={16} />
            </Toggle>
          </div>
        </div>
        <p className="mt-2 hidden text-[11px] text-muted pointer-fine:block">
          <Kbd>Espacio</Kbd> escuchar o pausar · <Kbd>←</Kbd> <Kbd>→</Kbd> frase · <Kbd>V</Kbd> texto · <Kbd>T</Kbd>{' '}
          traducción · <Kbd>L</Kbd> despacio
        </p>
      </div>
    </>
  )
}

/** Rayas que ocupan el lugar de las palabras con el texto oculto: de anchos variados, como las palabras. */
const BARS = Array.from({ length: 40 }, (_, i) => ({ id: `raya-${i}`, width: `${1.4 + ((i * 7) % 5) * 0.45}rem` }))

/** Una frase del texto: se toca para escucharla desde ahí. Oculta, se ve como una línea en blanco. */
function SentenceRow({
  ref,
  sentence,
  number,
  active,
  playing,
  showText,
  showTranslation,
  onPlay,
}: {
  ref: (element: HTMLElement | null) => void
  sentence: Sentence
  number: number
  active: boolean
  playing: boolean
  showText: boolean
  showTranslation: boolean
  onPlay: () => void
}) {
  const words = sentence.en.split(/\s+/).length
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPlay}
      aria-current={active ? 'true' : undefined}
      aria-label={showText ? undefined : `Escuchar la frase ${number}`}
      className={cn(
        'group flex w-full cursor-pointer items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        active ? 'bg-accent-soft' : 'hover:bg-surface',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-1 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums',
          active ? 'bg-brand text-accent-ink' : 'bg-line/70 text-muted',
          playing && 'animate-pulse-soft',
        )}
      >
        {number}
      </span>
      <span className="min-w-0 flex-1">
        {showText ? (
          <span lang="en" className={cn('block text-lg leading-relaxed', active ? 'text-ink' : 'text-ink/85')}>
            {sentence.en}
          </span>
        ) : (
          // Tantas rayas como palabras, más o menos: se intuye el largo sin delatar el texto.
          <span aria-hidden className="flex flex-wrap gap-1.5 py-2">
            {BARS.slice(0, words).map((bar) => (
              <span
                key={bar.id}
                className={cn('h-2.5 rounded-full', active ? 'bg-accent/35' : 'bg-line')}
                style={{ width: bar.width }}
              />
            ))}
          </span>
        )}
        {showTranslation && (
          <span lang="es" className="mt-0.5 block text-[15px] leading-relaxed text-muted">
            {sentence.es}
          </span>
        )}
      </span>
    </button>
  )
}

// --- Leer en voz alta ----------------------------------------------------------------------------

const WORD_IDS = new Map(ALL_WORDS.map((word) => [word.en.toLowerCase(), word.id]))

/** Escuchar una palabra suelta: su pronunciación grabada si está en el vocabulario; si no, la voz del navegador. */
function sayWord(word: string) {
  const id = WORD_IDS.get(word)
  if (id) void playPronunciation(id)
  else speakEnglish(word)
}

type Listening = { step: 'idle' } | { step: 'listening' } | { step: 'error'; message: string }

const ERRORS = {
  denied: 'Sin permiso para usar el micrófono. Actívalo en los ajustes del navegador y prueba de nuevo.',
  'no-speech': 'No te oí. Toca el micrófono y lee la frase en voz alta.',
  failed: 'El reconocimiento de voz no respondió. Prueba de nuevo en un momento.',
} as const

interface Summary {
  score: number
  correct: number
  total: number
  missed: string[]
  passedBefore: boolean
}

function ReadView({ text, onSwitch, onNext, nextTitle }: { text: StudyText } & ViewActions) {
  const sentences = useMemo(() => sentencesOf(text), [text])
  const targets = useMemo(() => sentences.map((sentence) => targetWords(sentence.en)), [sentences])
  const progress = useTextProgress()
  const [index, setIndex] = useState(0)
  /** La mejor lectura de cada frase: qué palabras se entendieron. */
  const [best, setBest] = useState<Array<boolean[] | null>>(() => sentences.map(() => null))
  const [live, setLive] = useState<boolean[] | null>(null)
  const [listening, setListening] = useState<Listening>({ step: 'idle' })
  const [showTranslation, setShowTranslation] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const session = useRef<{ stop: () => void; cancel: () => void } | null>(null)
  const latest = useRef<boolean[]>([])
  const run = useRef(0)

  useEffect(
    () => () => {
      session.current?.cancel()
      run.current++
      silence()
    },
    [],
  )

  if (!canRecognizeSpeech()) {
    return (
      <>
        <TextHeading text={text} mode="read" />
        <Surface className="mt-6 p-6">
          <p className="text-[17px] font-semibold">Este navegador no puede escuchar tu voz</p>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">
            Para leer en voz alta hace falta el reconocimiento de voz de Chrome, Edge o Safari. Mientras tanto, puedes
            escuchar el texto y repetirlo frase a frase.
          </p>
          <Button variant="primary" onClick={onSwitch} className="mt-4">
            <HeadphonesIcon width={16} height={16} />
            Escuchar el texto
          </Button>
        </Surface>
      </>
    )
  }

  const target = targets[index]
  const isListening = listening.step === 'listening'
  const result = best[index]
  const shown = live ?? result
  const allRead = best.every((entry) => entry !== null)

  function stopListening() {
    session.current?.stop()
  }

  function listen() {
    run.current++
    silence()
    session.current?.cancel()
    latest.current = target.map(() => false)
    setLive(latest.current)
    setListening({ step: 'listening' })
    const sentence = index
    session.current = startDictation({
      onTranscript: (transcript) => {
        const matched = alignSpoken(target, heardWords(transcript))
        latest.current = matched
        setLive(matched)
        // Todo entendido: no hace falta esperar al silencio.
        if (matched.every(Boolean)) session.current?.stop()
      },
      onEnd: (error) => {
        session.current = null
        setLive(null)
        if (error && !latest.current.some(Boolean)) {
          setListening({ step: 'error', message: ERRORS[error] })
          return
        }
        setListening({ step: 'idle' })
        const matched = latest.current
        feedback(spokenScore(matched) >= SENTENCE_PASS ? 'correct' : 'wrong')
        setBest((previous) =>
          previous.map((entry, i) =>
            i === sentence && (entry === null || spokenScore(matched) >= spokenScore(entry)) ? matched : entry,
          ),
        )
      },
    })
  }

  function select(to: number) {
    session.current?.cancel()
    session.current = null
    setLive(null)
    setListening({ step: 'idle' })
    setIndex(Math.min(Math.max(to, 0), sentences.length - 1))
  }

  function hearModel() {
    session.current?.cancel()
    session.current = null
    setLive(null)
    setListening({ step: 'idle' })
    const token = ++run.current
    void sayOnce(sentences[index].en, false, () => token === run.current)
  }

  function finish() {
    const total = targets.reduce((sum, words) => sum + words.length, 0)
    const correct = best.reduce((sum, entry) => sum + (entry?.filter(Boolean).length ?? 0), 0)
    const missed = [
      ...new Set(targets.flatMap((words, i) => words.filter((_, w) => !best[i]?.[w]).map((word) => word.key))),
    ].slice(0, 16)
    const score = total === 0 ? 0 : correct / total
    const passedBefore = spokenPassed(progress, text.id)
    recordSpoken(text.id, correct, score)
    feedback(score >= SPOKEN_PASS ? 'goal' : 'correct')
    setSummary({ score, correct, total, missed, passedBefore })
  }

  function restart() {
    setSummary(null)
    setBest(sentences.map(() => null))
    setIndex(0)
  }

  if (summary) {
    return (
      <>
        <TextHeading text={text} mode="read" />
        <ReadSummary summary={summary} onRestart={restart} onNext={onNext} nextTitle={nextTitle} onListen={onSwitch} />
      </>
    )
  }

  const score = result ? spokenScore(result) : null
  const passed = score !== null && score >= SENTENCE_PASS
  const last = index === sentences.length - 1

  return (
    <>
      <TextHeading text={text} mode="read" />

      <Surface className="mt-6 p-5 sm:p-7" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase tabular-nums">
            Frase {index + 1} de {sentences.length}
          </p>
          <div className="flex items-center gap-1">
            <IconButton label="Escuchar el modelo" hover="accent" onClick={hearModel}>
              <SpeakerIcon width={18} height={18} />
            </IconButton>
            <IconButton
              label={showTranslation ? 'Ocultar la traducción' : 'Ver la traducción'}
              hover="accent"
              aria-pressed={showTranslation}
              onClick={() => setShowTranslation(!showTranslation)}
              className={cn(showTranslation && 'bg-accent-soft text-accent')}
            >
              <TranslationIcon width={18} height={18} />
            </IconButton>
          </div>
        </div>
        <p lang="en" className="mt-4 text-2xl leading-relaxed font-medium tracking-[-0.01em] sm:text-[1.7rem]">
          <SpokenWords words={target} matched={shown} final={!isListening && result !== null} />
        </p>
        {showTranslation && (
          <p lang="es" className="mt-2 text-[15px] leading-relaxed text-muted">
            {sentences[index].es}
          </p>
        )}

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={isListening ? stopListening : listen}
            aria-pressed={isListening}
            aria-label={isListening ? 'Dejar de escuchar' : 'Leer la frase en voz alta'}
            className={cn(
              'relative grid size-20 cursor-pointer place-items-center rounded-full text-accent-ink shadow-glow transition-transform',
              'hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95',
              isListening ? 'bg-bad' : 'bg-brand',
            )}
          >
            {isListening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-bad/30" />}
            <MicIcon width={30} height={30} />
          </button>
          <p className="min-h-5 text-center text-sm text-muted">
            {isListening
              ? 'Te escucho… lee la frase en voz alta'
              : listening.step === 'error'
                ? listening.message
                : score === null
                  ? 'Toca el micrófono y lee la frase'
                  : passed
                    ? `¡Muy bien! ${pct(score)} de las palabras se entendieron.`
                    : `Se entendió el ${pct(score)}. Escucha el modelo y prueba otra vez.`}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-5">
          <Button variant="ghost" onClick={() => select(index - 1)} disabled={index === 0 || isListening}>
            Anterior
          </Button>
          {result && !passed && (
            <Button onClick={listen} disabled={isListening}>
              <RepeatIcon width={16} height={16} />
              Repetir
            </Button>
          )}
          {last ? (
            <Button variant="primary" onClick={finish} disabled={!allRead || isListening}>
              Ver mi resultado
              <ArrowRightIcon width={16} height={16} />
            </Button>
          ) : (
            <Button variant={result ? 'primary' : 'secondary'} onClick={() => select(index + 1)} disabled={isListening}>
              {result ? 'Siguiente frase' : 'Saltar'}
              <ArrowRightIcon width={16} height={16} />
            </Button>
          )}
        </div>
        {last && !allRead && (
          <p className="mt-3 text-center text-xs text-muted">
            Lee todas las frases para ver tu resultado ({best.filter(Boolean).length} de {sentences.length}).
          </p>
        )}
      </Surface>

      <ol aria-label="Frases del texto" className="mt-6 space-y-1.5">
        {sentences.map((sentence, i) => {
          const entry = best[i]
          const entryScore = entry ? spokenScore(entry) : null
          return (
            <li key={sentence.en}>
              <button
                type="button"
                onClick={() => select(i)}
                disabled={isListening}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors disabled:cursor-default',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  i === index ? 'bg-accent-soft' : 'hover:bg-surface',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums',
                    entryScore === null
                      ? 'bg-line/70 text-muted'
                      : entryScore >= SENTENCE_PASS
                        ? 'bg-ok-soft text-ok'
                        : 'bg-bad-soft text-bad',
                  )}
                >
                  {i + 1}
                </span>
                <span
                  lang="en"
                  className={cn('min-w-0 flex-1 text-[15px] leading-relaxed', i !== index && 'text-ink/75')}
                >
                  {sentence.en}
                </span>
                {entryScore !== null && (
                  <span className="shrink-0 pt-0.5 text-xs font-semibold text-muted tabular-nums">
                    {pct(entryScore)}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}

/** Las palabras de la frase: en verde las entendidas; al terminar, las que faltaron se subrayan. */
function SpokenWords({
  words,
  matched,
  final,
}: {
  words: readonly TargetWord[]
  matched: readonly boolean[] | null
  final: boolean
}) {
  // Una palabra puede repetirse en la frase («the… the»): su clave es la palabra y cuántas van.
  const seen = new Map<string, number>()
  const entries = words.map((word, i) => {
    const count = (seen.get(word.key) ?? 0) + 1
    seen.set(word.key, count)
    return { word, id: `${word.key}#${count}`, ok: matched?.[i] ?? false, last: i === words.length - 1 }
  })
  return (
    <>
      {entries.map(({ word, id, ok, last }) => {
        return (
          <span key={id}>
            <span
              className={cn(
                'rounded-md transition-colors duration-200',
                ok && 'text-ok',
                final && !ok && 'text-bad underline decoration-bad/50 decoration-wavy underline-offset-[6px]',
              )}
            >
              {word.text}
            </span>
            {!last && !word.text.endsWith('-') ? ' ' : ''}
          </span>
        )
      })}
    </>
  )
}

function ReadSummary({
  summary,
  onRestart,
  onNext,
  nextTitle,
  onListen,
}: {
  summary: Summary
  onRestart: () => void
  onNext: () => void
  nextTitle: string
  onListen: () => void
}) {
  const passed = summary.score >= SPOKEN_PASS
  return (
    <Surface className="mt-6 p-6 sm:p-8">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">Tu pronunciación</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className={cn('font-display text-7xl leading-none tabular-nums', passed ? 'text-ok' : 'text-brand')}>
          {pct(summary.score)}
        </p>
        <p className="pb-2 text-[15px] text-muted">
          {summary.correct} de {summary.total} palabras se entendieron
          {passed && !summary.passedBefore ? ' · texto superado' : ''}
        </p>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed">
        {passed
          ? 'Se te entiende muy bien. Prueba con el siguiente texto o súbele el nivel.'
          : `Buen trabajo. Repasa las palabras de abajo y vuelve a leerlo: se supera con el ${Math.round(SPOKEN_PASS * 100)} %.`}
      </p>
      {summary.missed.length > 0 && (
        <>
          <h2 className="mt-6 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Para practicar</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.missed.map((word) => (
              <li key={word}>
                <button
                  type="button"
                  lang="en"
                  onClick={() => sayWord(word)}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-bg px-3 text-sm font-semibold transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <SpeakerIcon width={14} height={14} />
                  {word}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-7 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onRestart}>
          <RepeatIcon width={16} height={16} />
          Leer otra vez
        </Button>
        <Button onClick={onListen}>
          <HeadphonesIcon width={16} height={16} />
          Escucharlo
        </Button>
        <Button variant="ghost" onClick={onNext} title={nextTitle}>
          Siguiente texto
        </Button>
      </div>
    </Surface>
  )
}
