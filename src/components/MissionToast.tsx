import { useEffect } from 'react'
import { dismissMissionAnnouncement, useMissionAnnouncement } from '@/lib/missions'
import { CheckCircleIcon } from './icons'

/** Cuánto se ve el aviso de una misión cumplida. */
const SHOW_MS = 3600

/** Aviso breve de cada misión cumplida (una tras otra si llegan varias). Los toques lo atraviesan. */
export function MissionToast() {
  const current = useMissionAnnouncement()

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(dismissMissionAnnouncement, SHOW_MS)
    return () => clearTimeout(timer)
  }, [current])

  if (!current) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto flex max-w-sm animate-rise items-center gap-3.5 rounded-2xl border border-line bg-raised py-3 pr-4 pl-3 shadow-float"
    >
      <span className="grid size-11 shrink-0 animate-pop place-items-center rounded-full bg-ok-soft text-ok">
        <CheckCircleIcon width={24} height={24} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-[0.14em] text-ok uppercase">
          Misión cumplida · +{current.xp} XP
        </span>
        <span className="block text-[15px] font-semibold">{current.title}</span>
        <span className="block truncate text-[13px] text-muted">{current.description}</span>
      </span>
    </div>
  )
}
