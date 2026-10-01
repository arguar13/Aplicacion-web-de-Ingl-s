import { lazy, Suspense, useEffect, useState } from 'react'
import type { Backup } from '@/lib/backup'
import type { Deck } from '@/lib/decks'
import { finishOnboarding } from '@/lib/onboarding'
import { welcomePrerendered } from '@/lib/prerender'
import { WelcomeScreen } from './Welcome'

const loadFlow = () => import('./OnboardingFlow')
const OnboardingFlow = lazy(() => loadFlow().then((module) => ({ default: module.OnboardingFlow })))

/**
 * Bienvenida del primer uso: qué es OpenSpeak, la meta diaria y, si se quiere, una prueba de nivel que
 * recomienda por dónde empezar. Todo se puede saltar. La portada va en el paquete principal (se pinta
 * al instante); los pasos siguientes, en OnboardingFlow, se cargan mientras se lee la portada.
 */
export function Onboarding({ onStart }: { onStart: (deck: Deck) => void }) {
  const [step, setStep] = useState<'welcome' | 'goal' | 'restore'>('welcome')
  const [backup, setBackup] = useState<Backup | null>(null)
  // La bienvenida pintada desde el HTML ya se ve: no se anima al montarse.
  const [still] = useState(welcomePrerendered)

  useEffect(() => {
    void loadFlow()
  }, [])

  if (step === 'welcome') {
    return (
      <WelcomeScreen
        still={still}
        onStart={() => setStep('goal')}
        onSkip={finishOnboarding}
        onBackup={(parsed) => {
          setBackup(parsed)
          setStep('restore')
        }}
      />
    )
  }

  return (
    <Suspense fallback={null}>
      <OnboardingFlow start={step} backup={backup} onBack={() => setStep('welcome')} onStart={onStart} />
    </Suspense>
  )
}
