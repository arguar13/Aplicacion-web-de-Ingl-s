import { useEffect, useRef, useState } from 'react'
import { loadAudioVersions } from '@/lib/audioUrl'
import { recordedCourseIds } from '@/lib/courseAudio'
import { ALL_WORDS } from '@/lib/decks'
import {
  countCachedAudio,
  downloadAudio,
  isIOS,
  isStandalone,
  useInstallPrompt,
  useOfflineAudioSupported,
} from '@/lib/pwa'
import { Button } from './ui/Button'
import { SettingRow } from './ui/SettingRow'

/** Fila de ajustes: título y descripción a la izquierda, control a la derecha. */
export function InstallRow() {
  const { available, install } = useInstallPrompt()
  if (typeof window === 'undefined' || isStandalone()) return null

  if (available) {
    return (
      <SettingRow title="Instalar la app" description="Ábrela desde tu pantalla de inicio, a pantalla completa.">
        <Button onClick={() => void install()}>Instalar</Button>
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

const WORD_IDS = ALL_WORDS.map((w) => w.id)
const APPROX_MB = import.meta.env.AUDIO_MB

/** Todo el audio publicado: las pronunciaciones y las frases grabadas del curso (si las hay). */
async function allAudioIds(): Promise<string[]> {
  return [...WORD_IDS, ...recordedCourseIds(await loadAudioVersions())]
}

export function OfflineAudioRow() {
  const [ids, setIds] = useState<string[]>(WORD_IDS)
  const [cached, setCached] = useState<number | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)
  const TOTAL = ids.length

  const supported = useOfflineAudioSupported()

  useEffect(() => {
    if (!supported) return
    void allAudioIds().then(async (all) => {
      setIds(all)
      setCached(await countCachedAudio(all))
    })
  }, [supported])

  useEffect(() => () => controller.current?.abort(), [])

  if (!supported) return null

  async function start() {
    controller.current = new AbortController()
    setProgress(0)
    await downloadAudio(ids, setProgress, controller.current.signal)
    setProgress(null)
    setCached(await countCachedAudio(ids))
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
              : `Guarda los ${TOTAL.toLocaleString('es')} audios (pronunciaciones y frases del curso, ~${APPROX_MB} MB) para estudiar sin internet.`
        }
      >
        {complete ? (
          <span className="shrink-0 text-sm font-semibold text-ok">Listo</span>
        ) : downloading ? (
          <Button onClick={() => controller.current?.abort()}>Cancelar</Button>
        ) : (
          <Button onClick={() => void start()}>Descargar</Button>
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
