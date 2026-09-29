import { cn } from '@/lib/cn'
import type { Word } from '@/lib/types'

type KeyState = 'idle' | 'correct' | 'wrong' | 'dimmed'

interface Props {
  options: Word[]
  /** Idioma de las respuestas. */
  language: 'es' | 'en'
  answerId: string
  wrong: string[]
  solved: boolean
  onAnswer: (id: string) => void
}

export function Keypad({ options, language, answerId, wrong, solved, onAnswer }: Props) {
  const stateOf = (id: string): KeyState => {
    if (solved) return id === answerId ? 'correct' : 'dimmed'
    return wrong.includes(id) ? 'wrong' : 'idle'
  }

  return (
    <div role="group" aria-label="Respuestas" className="grid grid-cols-2 gap-3 sm:gap-4 short:gap-3">
      {options.map((option, index) => (
        <OptionKey
          key={`${answerId}-${option.id}`}
          label={language === 'es' ? option.es : option.en}
          lang={language}
          shortcut={index + 1}
          state={stateOf(option.id)}
          onPress={() => onAnswer(option.id)}
        />
      ))}
    </div>
  )
}

const stateStyles: Record<KeyState, string> = {
  idle: cn(
    'cursor-pointer border-line bg-surface text-ink shadow-key',
    'hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-key-hover',
    'active:translate-y-0 active:scale-[0.98]',
  ),
  correct: 'animate-pop border-ok bg-ok text-ok-ink shadow-[0_16px_36px_-16px_var(--ok)]',
  wrong: 'animate-shake border-bad/40 bg-bad-soft text-bad',
  dimmed: 'border-line bg-surface text-muted opacity-40',
}

interface KeyProps {
  label: string
  lang: string
  shortcut: number
  state: KeyState
  onPress: () => void
}

function OptionKey({ label, lang, shortcut, state, onPress }: KeyProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={state !== 'idle'}
      aria-keyshortcuts={String(shortcut)}
      className={cn(
        'relative flex min-h-24 items-center justify-center rounded-[20px] border px-4 pt-5 pb-4 text-center text-[17px] leading-snug font-medium select-none sm:min-h-28 sm:text-lg md:min-h-32 md:text-xl short:min-h-22 short:text-base',
        'transition-[translate,scale,box-shadow,background-color,border-color,color,opacity] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        stateStyles[state],
      )}
    >
      {/* El número es el atajo de teclado: como los demás atajos, solo con ratón o trackpad. */}
      <span
        aria-hidden
        className="absolute top-3 left-3 hidden size-5 items-center justify-center rounded-md bg-current/8 text-[11px] font-semibold tabular-nums opacity-70 pointer-fine:flex"
      >
        {shortcut}
      </span>
      <span lang={lang}>{label}</span>
    </button>
  )
}
