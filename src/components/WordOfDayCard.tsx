import { playPronunciation } from '@/lib/audio'
import { dayKey, useProgress } from '@/lib/progress'
import { POS_LABEL, useWordDetails } from '@/lib/details'
import { useSettings } from '@/lib/settings'
import { wordOfDay } from '@/lib/wordOfDay'
import { SpeakerIcon } from './icons'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { SpeakExampleButton } from './SpeakExampleButton'

/**
 * Palabra del día: una palabra nueva un poco más adelante de por donde vas, con su pronunciación y
 * un ejemplo. "Ver ficha" abre su ficha (favorita, progreso, pronunciar).
 */
export function WordOfDayCard({ now, onOpenWord }: { now: number; onOpenWord: (id: string) => void }) {
  const progress = useProgress()
  const { startLevel } = useSettings()
  const word = wordOfDay(progress, dayKey(now), startLevel)
  const details = useWordDetails(word.id)
  return (
    <section
      aria-labelledby="palabra-del-dia"
      className="mt-4 animate-rise rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="palabra-del-dia" className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
          Palabra del día
        </h2>
        <Badge tone="accent-soft">{POS_LABEL[word.pos]}</Badge>
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p lang="en" className="truncate font-display text-4xl leading-none">
            {word.en}
          </p>
          <p className="mt-2 text-[15px]">
            {details?.ipa && <span className="mr-2 text-muted">{details.ipa}</span>}
            <span className="font-medium">{word.es}</span>
          </p>
        </div>
        <IconButton
          label={`Escuchar «${word.en}»`}
          onClick={() => void playPronunciation(word.id)}
          className="shrink-0"
        >
          <SpeakerIcon />
        </IconButton>
      </div>
      {details?.example && (
        <div className="mt-4 flex items-start gap-2 border-l-2 border-accent/40 pl-3">
          <p className="min-w-0 flex-1 text-sm leading-relaxed">
            <span lang="en" className="block font-medium">
              {details.example.en}
            </span>
            <span className="block text-muted">{details.example.es}</span>
          </p>
          <SpeakExampleButton text={details.example.en} className="-mt-1" />
        </div>
      )}
      <Button size="sm" onClick={() => onOpenWord(word.id)} className="mt-4">
        Ver ficha
      </Button>
    </section>
  )
}
