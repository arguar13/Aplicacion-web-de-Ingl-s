import { cn } from '@/lib/cn'
import type { Direction, Word } from '@/lib/types'

type KeyState = 'idle' | 'correct' | 'wrong' | 'dimmed'

interface Props {
  options: Word[]
  direction: Direction
  answerId: string
  wrong: string[]
  solved: boolean
  onAnswer: (id: string) => void
}

export function Keypad({ options, direction, answerId, wrong, solved, onAnswer }: Props) {
  const stateOf = (id: string): KeyState => {
    if (solved) return id === answerId ? 'correct' : 'dimmed'
    return wrong.includes(id) ? 'wrong' : 'idle'
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 short:gap-3">
      {options.map((option, index) => (
        <OptionKey
          key={`${answerId}-${option.id}`}
          label={direction === 'en-es' ? option.es : option.en}
          lang={direction === 'en-es' ? 'es' : 'en'}
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
    'cursor-pointer border-line bg-raised text-ink shadow-[0_4px_0_0_var(--line-strong)]',
    'hover:border-accent/40 hover:shadow-[0_4px_0_0_color-mix(in_oklab,var(--accent)_35%,var(--line-strong))]',
    'active:translate-y-1 active:shadow-none',
  ),
  correct: 'animate-pop border-ok bg-ok text-ok-ink shadow-[0_4px_0_0_color-mix(in_oklab,var(--ok)_65%,black)]',
  wrong:
    'animate-shake border-bad/30 bg-bad-soft text-bad shadow-[0_4px_0_0_color-mix(in_oklab,var(--bad)_25%,transparent)]',
  dimmed: 'border-line bg-raised text-muted opacity-45 shadow-[0_4px_0_0_var(--line)]',
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
        'relative flex min-h-24 items-center justify-center rounded-2xl border px-4 pt-5 pb-4 text-center text-[17px] leading-snug font-medium select-none sm:min-h-28 sm:text-lg md:min-h-32 md:text-xl short:min-h-22 short:text-base',
        'transition-[translate,box-shadow,background-color,border-color,color,opacity] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        stateStyles[state],
      )}
    >
      <span className="absolute top-2.5 left-3.5 text-[11px] font-semibold tabular-nums opacity-50">{shortcut}</span>
      <span lang={lang}>{label}</span>
    </button>
  )
}
