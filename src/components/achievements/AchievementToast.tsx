import { useEffect } from 'react'
import { dismissAnnouncement, useAnnouncement } from '@/lib/achievements'
import { Medal } from './Medal'

/** Cuánto se ve el aviso de un logro. */
const SHOW_MS = 4200

/** Aviso breve de cada logro nuevo (uno tras otro si llegan varios). Los toques lo atraviesan: no tapa la cabecera. */
export function AchievementToast() {
  const current = useAnnouncement()

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(dismissAnnouncement, SHOW_MS)
    return () => clearTimeout(timer)
  }, [current])

  if (!current) return null
  // Los logros van de menor a mayor: si llegan varios, se destaca el más importante.
  const first = current[current.length - 1]
  const more = current.length - 1
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto flex max-w-sm animate-rise items-center gap-3.5 rounded-2xl border border-line bg-raised py-3 pr-4 pl-3 shadow-float"
    >
      <span className="animate-pop">
        <Medal icon={first.icon} unlocked size={44} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
          {more ? `${current.length} logros desbloqueados` : 'Logro desbloqueado'}
        </span>
        <span className="block text-[15px] font-semibold">{first.title}</span>
        <span className="block truncate text-[13px] text-muted">
          {more ? `y ${more === 1 ? 'otro más' : `${more} más`}: míralos en Tu progreso` : first.description}
        </span>
      </span>
    </div>
  )
}
