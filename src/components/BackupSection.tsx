import { type ChangeEvent, useId, useRef, useState } from 'react'
import {
  type Backup,
  backupFileName,
  currentBackup,
  describeProgress,
  readBackupFile,
  type RestoreMode,
  restoreBackup,
} from '@/lib/backup'
import { canShareFiles, saveTextFile, shareTextFile } from '@/lib/download'
import { formatLongDate, plural, relativeDay } from '@/lib/format'
import { markBackupSaved, requestProtection, useProtection, useSafekeeping } from '@/lib/safekeeping'
import { SettingRow } from './AppSettings'
import { Button } from './ui/Button'

export function saveBackup() {
  const now = Date.now()
  saveTextFile(backupFileName(now), currentBackup(now))
  markBackupSaved(now)
}

/**
 * Envía la copia con la hoja de compartir del sistema (a otro dispositivo, a la nube, a un chat).
 * Si el sistema no pudo compartirla, se descarga: la copia nunca se queda sin hacer.
 */
async function sendBackup() {
  const now = Date.now()
  const result = await shareTextFile(backupFileName(now), currentBackup(now))
  if (result === 'shared') markBackupSaved(now)
  else if (result === 'failed') saveBackup()
}

type RestoreState =
  | { step: 'idle' }
  | { step: 'preview'; backup: Backup }
  | { step: 'done'; message: string }
  | { step: 'error'; message: string }

/** Copias de seguridad del progreso y protección del almacenamiento, dentro de Ajustes. */
export function BackupSection() {
  const { lastBackupAt } = useSafekeeping()
  const [canShare] = useState(canShareFiles)
  const [restore, setRestore] = useState<RestoreState>({ step: 'idle' })
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Vaciar el campo permite volver a elegir el mismo archivo.
    event.target.value = ''
    if (!file) return
    const parsed = await readBackupFile(file)
    setRestore(parsed.ok ? { step: 'preview', backup: parsed.backup } : { step: 'error', message: parsed.error })
  }

  function apply(backup: Backup, mode: RestoreMode) {
    restoreBackup(backup, mode)
    setRestore({
      step: 'done',
      message:
        mode === 'merge' ? 'Listo: la copia se combinó con tu progreso.' : 'Listo: tu progreso es el de la copia.',
    })
  }

  return (
    <div className="py-4">
      <p className="text-[15px] font-medium">Tu progreso</p>
      <p className="mt-0.5 text-[13px] leading-snug text-muted">
        Se guarda solo en este dispositivo. Guarda una copia para no perderlo o para seguir en otro.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={saveBackup}>
          Guardar copia
        </Button>
        {canShare && <Button onClick={() => void sendBackup()}>Enviar copia</Button>}
        <Button onClick={() => input.current?.click()} aria-controls={inputId}>
          Restaurar copia
        </Button>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept="application/json,.json"
          onChange={(event) => void onFile(event)}
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo de copia de Tecla"
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {lastBackupAt === null ? 'Aún no guardaste ninguna copia.' : `Última copia: ${relativeDay(lastBackupAt)}.`}
      </p>

      <div aria-live="polite">
        {restore.step === 'preview' && (
          <RestorePreview
            backup={restore.backup}
            onApply={(mode) => apply(restore.backup, mode)}
            onCancel={() => setRestore({ step: 'idle' })}
          />
        )}
        {restore.step === 'done' && <p className="mt-3 text-sm font-medium text-ok">{restore.message}</p>}
        {restore.step === 'error' && (
          <p role="alert" className="mt-3 text-sm font-medium text-bad">
            {restore.message}
          </p>
        )}
      </div>
    </div>
  )
}

function RestorePreview({
  backup,
  onApply,
  onCancel,
}: {
  backup: Backup
  onApply: (mode: RestoreMode) => void
  onCancel: () => void
}) {
  return (
    <div className="mt-3 animate-rise rounded-2xl border border-line bg-bg p-4">
      <BackupSummary backup={backup} />
      <p className="mt-3 text-[13px] leading-snug text-muted">
        <strong className="font-semibold text-ink">Combinar</strong> conserva lo más avanzado de cada palabra.{' '}
        <strong className="font-semibold text-ink">Reemplazar</strong> deja solo lo que hay en la copia.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => onApply('merge')}>
          Combinar
        </Button>
        <Button variant="danger-outline" onClick={() => onApply('replace')}>
          Reemplazar
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

/** Fecha de la copia y lo que contiene, para decidir antes de restaurarla. */
export function BackupSummary({ backup }: { backup: Backup }) {
  const overview = describeProgress(backup.progress)
  const facts = [
    `${plural(overview.words, 'palabra')} ${overview.words === 1 ? 'practicada' : 'practicadas'}`,
    plural(overview.mastered, 'dominada'),
    `${plural(overview.days, 'día')} de estudio`,
  ]
  return (
    <>
      <p className="text-sm font-semibold">
        {backup.exportedAt ? `Copia del ${formatLongDate(backup.exportedAt)}` : 'Copia de Tecla'}
      </p>
      <p className="mt-1 text-[13px] text-balance text-muted">{facts.join(' · ')}</p>
    </>
  )
}

/** Protección frente a borrados del navegador cuando falta espacio. */
export function ProtectionRow() {
  const protection = useProtection()
  if (protection === 'unsupported') return null
  return (
    <SettingRow
      title="Proteger el almacenamiento"
      description={
        protection === 'protected'
          ? 'El navegador no borrará tu progreso para liberar espacio.'
          : 'Pide al navegador que no borre tu progreso cuando le falte espacio.'
      }
    >
      {protection === 'protected' ? (
        <span className="shrink-0 text-sm font-semibold text-ok">Activa</span>
      ) : (
        <Button onClick={() => void requestProtection({ interactive: true })}>Proteger</Button>
      )}
    </SettingRow>
  )
}
