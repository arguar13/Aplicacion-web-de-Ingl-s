import { type ReactNode, useId, useState } from 'react'
import { resetAchievements } from '@/lib/achievements'
import { canVibrate } from '@/lib/feedback'
import { resetProgress } from '@/lib/progress'
import {
  DAILY_GOALS,
  type DetailsPause,
  NEW_PER_DAY,
  parseSettings,
  type ThemePreference,
  updateSettings,
  useSettings,
} from '@/lib/settings'
import { InstallRow, OfflineAudioRow, SettingRow } from './AppSettings'
import { BackupSection, ProtectionRow } from './BackupSection'
import { ReminderRow } from './ReminderRow'
import { Button } from './ui/Button'
import { Segmented, Switch } from './ui/controls'

const DETAILS_PAUSES: Array<{ value: DetailsPause; label: string }> = [
  { value: 'mistakes', label: 'Al fallar' },
  { value: 'always', label: 'Siempre' },
  { value: 'never', label: 'Nunca' },
]

const GOALS = DAILY_GOALS.map((goal) => ({ value: String(goal), label: String(goal) }))
const NEW_LIMITS = NEW_PER_DAY.map((limit) => ({
  value: String(limit),
  label: limit === 0 ? 'Sin límite' : String(limit),
}))

const THEMES: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

/** Contenido de Ajustes: se carga al abrirlos por primera vez (ver SettingsDialog). */
export function SettingsContent() {
  const settings = useSettings()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="mt-2">
      <Group title="Práctica">
        <ChoiceRow
          title="Meta diaria"
          description="Palabras que quieres responder cada día."
          value={String(settings.dailyGoal)}
          options={GOALS}
          onChange={(value) => updateSettings({ dailyGoal: parseSettings({ dailyGoal: Number(value) }).dailyGoal })}
        />
        <ChoiceRow
          title="Palabras nuevas por día"
          description="Al llegar al límite, la práctica sigue con lo que ya estás aprendiendo."
          value={String(settings.newPerDay)}
          options={NEW_LIMITS}
          onChange={(value) => updateSettings({ newPerDay: parseSettings({ newPerDay: Number(value) }).newPerDay })}
        />
        <ChoiceRow
          title="Detenerse a ver el ejemplo"
          description="Tras responder, muestra la frase de ejemplo y espera a que sigas. Siempre puedes verla con «Ver ejemplo»."
          value={settings.detailsPause}
          options={DETAILS_PAUSES}
          onChange={(detailsPause) => updateSettings({ detailsPause })}
        />
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
      </Group>

      <Group title="Sonido">
        <SettingRow title="Sonidos" description="Un aviso suave al acertar, al fallar y al cumplir la meta.">
          <Switch label="Sonidos" checked={settings.sounds} onChange={(sounds) => updateSettings({ sounds })} />
        </SettingRow>
        {canVibrate() && (
          <SettingRow title="Vibración" description="Un toque breve en los mismos momentos.">
            <Switch label="Vibración" checked={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
          </SettingRow>
        )}
      </Group>

      <Group title="Apariencia">
        <ChoiceRow
          title="Tema"
          value={settings.theme}
          options={THEMES}
          onChange={(theme) => updateSettings({ theme })}
        />
      </Group>

      <Group title="Recordatorio">
        <ReminderRow />
      </Group>

      <Group title="Tus datos">
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
                resetAchievements()
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
      </Group>

      <p className="mt-6 text-center text-xs text-muted">Tecla {import.meta.env.APP_VERSION}</p>
    </div>
  )
}

/** Sección de ajustes con su título. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="mt-5">
      <h3 id={id} className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
        {title}
      </h3>
      <div className="divide-y divide-line">{children}</div>
    </section>
  )
}

/** Ajuste con opciones excluyentes: título, explicación y un selector segmentado a lo ancho. */
function ChoiceRow<T extends string>({
  title,
  description,
  value,
  options,
  onChange,
}: {
  title: string
  description?: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="py-4">
      <p className="text-[15px] font-medium">{title}</p>
      {description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>}
      <Segmented label={title} value={value} options={options} onChange={onChange} className="mt-3 w-full" />
    </div>
  )
}
