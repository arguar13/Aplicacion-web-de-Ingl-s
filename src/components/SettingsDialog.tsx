import { useState } from 'react'
import { resetProgress } from '@/lib/progress'
import { type DetailsPause, type ThemePreference, updateSettings, useSettings } from '@/lib/settings'
import { InstallRow, OfflineAudioRow, SettingRow } from './AppSettings'
import { BackupSection, ProtectionRow } from './BackupSection'
import { Button } from './ui/Button'
import { Segmented, Switch } from './ui/controls'
import { Sheet } from './ui/Sheet'

const DETAILS_PAUSES: Array<{ value: DetailsPause; label: string }> = [
  { value: 'mistakes', label: 'Al fallar' },
  { value: 'always', label: 'Siempre' },
  { value: 'never', label: 'Nunca' },
]

const THEMES: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      {/* Solo montado mientras está abierto: cada apertura empieza sin confirmaciones ni vistas
          previas pendientes de la vez anterior. */}
      {open && <SettingsContent />}
    </Sheet>
  )
}

function SettingsContent() {
  const settings = useSettings()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
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
        <p className="text-[15px] font-medium">Detenerse a ver el ejemplo</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          Tras responder, muestra la frase de ejemplo y espera a que sigas. Siempre puedes verla con «Ver ejemplo».
        </p>
        <Segmented
          label="Detenerse a ver el ejemplo"
          value={settings.detailsPause}
          options={DETAILS_PAUSES}
          onChange={(detailsPause) => updateSettings({ detailsPause })}
          className="mt-3 flex w-full"
        />
      </div>

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

      <BackupSection />
      <ProtectionRow />
      <InstallRow />
      <OfflineAudioRow />

      <SettingRow title="Borrar progreso" description="Vuelve a empezar desde cero en este dispositivo.">
        {confirmReset ? (
          <Button
            variant="danger"
            onClick={() => {
              resetProgress()
              setConfirmReset(false)
            }}
          >
            Sí, borrar
          </Button>
        ) : (
          <Button variant="danger-outline" onClick={() => setConfirmReset(true)}>
            Borrar
          </Button>
        )}
      </SettingRow>
    </div>
  )
}
