import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ALL_WORDS } from '@/lib/decks'
import {
  countCachedAudio,
  downloadAudio,
  isIOS,
  isStandalone,
  useInstallPrompt,
  useOfflineAudioSupported,
} from '@/lib/pwa'

/** Fila de ajustes: título y descripción a la izquierda, control a la derecha. */
export function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{title}</p>
        <div className="mt-0.5 text-[13px] leading-snug text-muted">{description}</div>
      </div>
      {children}
    </div>
  )
}

const pillButton =
  'h-9 shrink-0 cursor-pointer rounded-full border border-line-strong px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60'

export function InstallRow() {
  const { available, install } = useInstallPrompt()
  if (typeof window === 'undefined' || isStandalone()) return null

  if (available) {
    return (
      <SettingRow title="Instalar la app" description="Ábrela desde tu pantalla de inicio, a pantalla completa.">
        <button type="button" onClick={() => void install()} className={pillButton}>
          Instalar
        </button>
      </SettingRow>
    )
  }

  if (isIOS()) {
    return (
      <SettingRow
        title="Instalar la app"
        description={
          <>
            En Safari, toca <strong className="font-semibold text-ink">Compartir</strong> y luego{' '}
            <strong className="font-semibold text-ink">Agregar a inicio</strong>.
          </>
        }
      />
    )
  }

  return null
}

const ALL_IDS = ALL_WORDS.map((w) => w.id)
const TOTAL = ALL_IDS.length
const APPROX_MB = Math.round((TOTAL * 5.6) / 1000)

export function OfflineAudioRow() {
  const [cached, setCached] = useState<number | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)

  const supported = useOfflineAudioSupported()

  useEffect(() => {
    if (supported) void countCachedAudio(ALL_IDS).then(setCached)
  }, [supported])

  useEffect(() => () => controller.current?.abort(), [])

  if (!supported) return null

  async function start() {
    controller.current = new AbortController()
    setProgress(0)
    await downloadAudio(ALL_IDS, setProgress, controller.current.signal)
    setProgress(null)
    setCached(await countCachedAudio(ALL_IDS))
  }

  const downloading = progress !== null
  const complete = cached !== null && cached >= TOTAL

  return (
    <div className="py-4">
      <SettingRow
        title="Audio sin conexión"
        description={
          complete
            ? 'Todas las pronunciaciones están guardadas en este dispositivo.'
            : downloading
              ? `Descargando… ${progress.toLocaleString('es')} de ${TOTAL.toLocaleString('es')}`
              : `Guarda las ${TOTAL.toLocaleString('es')} pronunciaciones (~${APPROX_MB} MB) para estudiar sin internet.`
        }
      >
        {complete ? (
          <span className="shrink-0 text-sm font-semibold text-ok">Listo</span>
        ) : downloading ? (
          <button type="button" onClick={() => controller.current?.abort()} className={pillButton}>
            Cancelar
          </button>
        ) : (
          <button type="button" onClick={() => void start()} className={pillButton}>
            Descargar
          </button>
        )}
      </SettingRow>
      {downloading && (
        <div className="-mt-1 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${(progress / TOTAL) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
