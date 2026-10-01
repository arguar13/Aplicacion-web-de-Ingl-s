import { useId, useState } from 'react'
import { useKeyDown } from '@/hooks/useKeyDown'
import { type Backup, restoreBackup } from '@/lib/backup'
import { type Deck, LEVELS } from '@/lib/decks'
import { plural } from '@/lib/format'
import { finishOnboarding } from '@/lib/onboarding'
import { answerPlacement, placementProgress, type PlacementState, startPlacement } from '@/lib/placement'
import { markKnown } from '@/lib/progress'
import { DAILY_GOALS, type DailyGoal, updateSettings, useSettings } from '@/lib/settings'
import { BackupSummary } from './BackupSection'
import { Actions, Panel, StepDots } from './Welcome'
import { Keypad } from './Keypad'
import { Button } from './ui/Button'
import { Kbd } from './ui/Kbd'
import { Surface } from './ui/Surface'

export type FlowStep = 'goal' | 'level' | 'test' | 'restore'

const GOAL_INFO: Record<DailyGoal, { name: string; time: string }> = {
  10: { name: 'Tranquilo', time: 'unos 3 min' },
  20: { name: 'Regular', time: 'unos 6 min' },
  40: { name: 'En serio', time: 'unos 12 min' },
  60: { name: 'Intenso', time: 'unos 18 min' },
}

/**
 * Los pasos de la bienvenida que siguen a la portada: la meta diaria, la prueba de nivel (si se
 * quiere) o restaurar una copia. Se cargan aparte: quien abre la app no los necesita para el primer
 * pintado, y Onboarding los adelanta en cuanto se ve la portada.
 */
export function OnboardingFlow({
  start,
  backup,
  onBack,
  onStart,
}: {
  start: 'goal' | 'restore'
  backup: Backup | null
  onBack: () => void
  onStart: (deck: Deck) => void
}) {
  const [step, setStep] = useState<FlowStep>(start)
  const [placement, setPlacement] = useState<PlacementState | null>(null)
  const { dailyGoal } = useSettings()
  const goalName = useId()

  function finish(deck: Deck) {
    finishOnboarding()
    onStart(deck)
  }

  function answer(id: string | null) {
    setPlacement((state) => (state ? answerPlacement(state, id) : state))
  }

  useKeyDown((event) => {
    if (step === 'test' && placement && placement.result === null) {
      const option = placement.items[placement.step].options[Number(event.key) - 1]
      if (option) answer(option.id)
      else if (event.key === '0') answer(null)
    }
  })

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg">
        {(step === 'goal' || step === 'level') && <StepDots current={step === 'goal' ? 1 : 2} />}

        {step === 'restore' && backup && (
          <Panel>
            <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Tu copia</p>
            <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Sigue donde lo dejaste</h1>
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-line bg-bg px-5 py-4">
              <BackupSummary backup={backup} />
            </div>
            <p className="mx-auto mt-4 max-w-sm text-[13px] leading-snug text-muted">
              Se restauran tu progreso, tus logros y tus ajustes en este dispositivo.
            </p>
            <Actions>
              <Button variant="ghost" size="lg" onClick={onBack}>
                Volver
              </Button>
              <Button variant="primary" size="lg" onClick={() => restoreBackup(backup, 'replace')}>
                Restaurar
              </Button>
            </Actions>
          </Panel>
        )}

        {step === 'goal' && (
          <Panel>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">¿Cuánto quieres practicar al día?</h1>
            <p className="mt-2 text-[15px] text-muted">Puedes cambiarlo cuando quieras en Ajustes.</p>
            <fieldset className="mt-6 grid grid-cols-2 gap-2.5">
              <legend className="sr-only">Meta diaria</legend>
              {DAILY_GOALS.map((goal) => (
                <label
                  key={goal}
                  className="relative cursor-pointer rounded-2xl border border-line bg-surface px-4 py-4 text-left transition-colors hover:border-accent/40 has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
                >
                  <input
                    type="radio"
                    name={goalName}
                    value={goal}
                    checked={dailyGoal === goal}
                    onChange={() => updateSettings({ dailyGoal: goal })}
                    className="sr-only"
                  />
                  <span className="block text-[15px] font-semibold">{GOAL_INFO[goal].name}</span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {plural(goal, 'palabra')} · {GOAL_INFO[goal].time}
                  </span>
                </label>
              ))}
            </fieldset>
            <Actions>
              <Button variant="primary" size="lg" onClick={() => setStep('level')}>
                Continuar
              </Button>
            </Actions>
          </Panel>
        )}

        {step === 'level' && (
          <Panel>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">¿Ya sabes algo de inglés?</h1>
            <p className="mt-2 text-[15px] text-muted">Así empiezas donde de verdad aprendes algo nuevo.</p>
            <div className="mt-6 grid gap-2.5">
              <Choice
                title="Hacer la prueba de nivel"
                detail="Se adapta a tus respuestas · unos 2 minutos"
                onClick={() => {
                  setPlacement(startPlacement())
                  setStep('test')
                }}
                primary
              />
              <Choice
                title="Empiezo desde cero"
                detail="Las 500 palabras más usadas"
                onClick={() => finish(LEVELS[0])}
              />
            </div>
          </Panel>
        )}

        {step === 'test' && placement && <PlacementTest state={placement} onAnswer={answer} onStart={finish} />}
      </div>
    </main>
  )
}

function PlacementTest({
  state,
  onAnswer,
  onStart,
}: {
  state: PlacementState
  onAnswer: (id: string | null) => void
  onStart: (deck: Deck) => void
}) {
  if (state.result !== null) {
    const deck = LEVELS[state.result - 1]
    return (
      <Panel>
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">Tu punto de partida</p>
        <h1 className="mt-3 font-display text-5xl leading-tight">
          Nivel {deck.level} · {deck.name}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
          {state.known.length > 0
            ? `Acertaste ${plural(state.known.length, 'palabra')}: las damos por sabidas. ${deck.description}`
            : deck.description}
        </p>
        <Actions>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              for (const word of state.known) markKnown('en-es', word.id)
              onStart(deck)
            }}
          >
            Empezar desde el nivel {deck.level}
          </Button>
        </Actions>
      </Panel>
    )
  }

  const item = state.items[state.step]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Prueba de nivel</span>
          <span>Nivel {item.level}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Avance de la prueba"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(placementProgress(state) * 100)}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${placementProgress(state) * 100}%` }}
          />
        </div>
      </div>
      <Surface as="section" className="px-5 py-9 text-center">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">¿Qué significa?</p>
        <h1 key={item.word.id} lang="en" className="mt-3 animate-rise font-display text-6xl leading-none sm:text-7xl">
          {item.word.en}
        </h1>
      </Surface>
      <Keypad
        key={item.word.id}
        options={item.options}
        language="es"
        answerId={item.word.id}
        wrong={[]}
        solved={false}
        onAnswer={onAnswer}
      />
      <Button variant="ghost" size="lg" onClick={() => onAnswer(null)} className="self-center">
        No la sé
        <Kbd size="sm">0</Kbd>
      </Button>
    </div>
  )
}

function Choice({
  title,
  detail,
  onClick,
  primary = false,
}: {
  title: string
  detail: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-center justify-between gap-4 rounded-3xl border px-5 py-4 text-left transition-[border-color,translate,box-shadow] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        primary
          ? 'border-transparent bg-brand text-accent-ink shadow-glow'
          : 'border-line bg-surface shadow-key hover:border-accent/40 hover:shadow-key-hover'
      }`}
    >
      <span>
        <span className="block text-[16px] font-semibold">{title}</span>
        <span className={`mt-0.5 block text-sm ${primary ? 'opacity-80' : 'text-muted'}`}>{detail}</span>
      </span>
      <span aria-hidden className="text-xl transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </button>
  )
}
