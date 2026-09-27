import { useNow } from '@/hooks/useNow'
import { useProgress } from '@/lib/progress'
import { needsBackupReminder, snoozeBackupReminder, storageAtRisk, useSafekeeping } from '@/lib/safekeeping'
import { saveBackup } from './BackupSection'
import { CloseIcon, ShieldIcon } from './icons'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'

/**
 * Aviso en el inicio para Safari sin instalar, donde el progreso se borra tras 7 días sin visitas:
 * ofrece guardar una copia. Aparece como mucho una vez por semana y se puede aplazar.
 */
export function BackupReminder({ onOpenSettings }: { onOpenSettings: () => void }) {
  const progress = useProgress()
  const safekeeping = useSafekeeping()
  const now = useNow()
  const show = needsBackupReminder({
    atRisk: storageAtRisk(),
    hasProgress: Object.keys(progress.cards).length > 0,
    safekeeping,
    now,
  })
  if (!show) return null

  return (
    <aside
      aria-labelledby="backup-reminder-title"
      className="relative mt-6 flex animate-rise gap-3.5 rounded-2xl border border-line bg-surface p-4 pr-12 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5 sm:pr-14"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <ShieldIcon />
      </span>
      <div className="min-w-0">
        <h2 id="backup-reminder-title" className="text-[15px] font-semibold">
          Protege tu progreso
        </h2>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          Safari borra los datos de las webs que no visitas en 7 días. Guarda una copia o{' '}
          <button
            type="button"
            onClick={onOpenSettings}
            className="cursor-pointer font-medium text-accent underline-offset-2 hover:underline"
          >
            agrega Tecla a tu inicio
          </button>
          .
        </p>
        <Button variant="primary" size="sm" onClick={saveBackup} className="mt-3">
          Guardar copia
        </Button>
      </div>
      <IconButton
        label="Recordármelo más tarde"
        hover="bg"
        onClick={() => snoozeBackupReminder()}
        className="absolute top-2.5 right-2.5"
      >
        <CloseIcon width={18} height={18} />
      </IconButton>
    </aside>
  )
}
