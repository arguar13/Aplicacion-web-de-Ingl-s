import { useId, useState } from 'react'
import { saveTextFile } from '@/lib/download'
import { buildReminderIcs, isTime } from '@/lib/reminder'
import { Button } from './ui/Button'

/**
 * Recordatorio diario: un evento en el calendario del dispositivo, a la hora elegida, que abre OpenSpeak
 * (una web sin servidor no puede avisar a una hora de forma fiable; el calendario sí).
 */
export function ReminderRow() {
  const [time, setTime] = useState('20:00')
  const [added, setAdded] = useState(false)
  const id = useId()

  function add() {
    const url = new URL(import.meta.env.BASE_URL, location.href).href
    saveTextFile('tecla-recordatorio.ics', buildReminderIcs({ time, url }), 'text/calendar')
    setAdded(true)
  }

  return (
    <div className="py-4">
      <p className="text-[15px] font-medium">Recordatorio diario</p>
      <p className="mt-0.5 text-[13px] leading-snug text-muted">
        Un aviso diario en tu calendario que abre OpenSpeak. Lo gestiona tu calendario: puedes cambiarlo o borrarlo ahí.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor={id} className="sr-only">
          Hora del recordatorio
        </label>
        <input
          id={id}
          type="time"
          value={time}
          onChange={(event) => {
            setTime(event.target.value)
            setAdded(false)
          }}
          className="h-9 rounded-full border border-line-strong bg-raised px-3 text-sm text-ink tabular-nums outline-none focus:border-accent"
        />
        <Button onClick={add} disabled={!isTime(time)}>
          Añadir al calendario
        </Button>
      </div>
      {added && (
        <p role="status" className="mt-2 text-[13px] text-ok">
          Listo: abre el archivo para añadir el aviso de las {time} a tu calendario.
        </p>
      )}
    </div>
  )
}
