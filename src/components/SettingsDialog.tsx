import { type RefObject, useEffect, useRef, useState } from 'react'
import { resetProgress } from '@/lib/progress'
import { type ThemePreference, updateSettings, useSettings } from '@/lib/settings'
import { InstallRow, OfflineAudioRow, SettingRow } from './AppSettings'
import { Segmented, Switch } from './controls'
import { CloseIcon } from './icons'

const THEMES: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const settings = useSettings()
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useLightDismissFallback(ref)

  function close() {
    setConfirmReset(false)
    onClose()
  }

  return (
    <dialog
      ref={ref}
      onClose={close}
      closedby="any"
      aria-labelledby="settings-title"
      className={[
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[28px] border border-line bg-surface p-0 text-ink',
        'shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.25)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px]',
        'open:animate-rise sm:m-auto sm:max-w-md sm:rounded-[28px]',
      ].join(' ')}
    >
      <div className="px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7 sm:pb-7">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="font-display text-3xl">
            Ajustes
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-bg hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-5 divide-y divide-line">
          <SettingRow
            title="Pronunciación automática"
            description="Suena al aparecer cada palabra. En modo español → inglés, al acertar."
          >
            <Switch
              label="Pronunciación automática"
              checked={settings.autoplay}
              onChange={(autoplay) => updateSettings({ autoplay })}
            />
          </SettingRow>

          <div className="py-4">
            <p className="text-[15px] font-medium">Tema</p>
            <Segmented
              label="Tema"
              value={settings.theme}
              options={THEMES}
              onChange={(theme) => updateSettings({ theme })}
              className="mt-3 flex w-full"
            />
          </div>

          <InstallRow />
          <OfflineAudioRow />

          <SettingRow title="Borrar progreso" description="Vuelve a empezar desde cero en este dispositivo.">
            {confirmReset ? (
              <button
                type="button"
                onClick={() => {
                  resetProgress()
                  setConfirmReset(false)
                }}
                className="h-9 shrink-0 cursor-pointer rounded-full bg-bad px-4 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad"
              >
                Sí, borrar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="h-9 shrink-0 cursor-pointer rounded-full border border-bad/40 px-4 text-sm font-semibold text-bad transition-colors hover:bg-bad-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad"
              >
                Borrar
              </button>
            )}
          </SettingRow>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-muted">
          Tu progreso se guarda solo en este dispositivo y navegador.
        </p>
      </div>
    </dialog>
  )
}

/**
 * `closedby="any"` cierra el diálogo al tocar fuera. En los navegadores que aún no lo soportan, se
 * replica: un toque sobre el propio <dialog> (y no sobre su contenido) es un toque en el fondo.
 */
function useLightDismissFallback(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close()
    }
    dialog.addEventListener('click', onClick)
    return () => dialog.removeEventListener('click', onClick)
  }, [ref])
}
