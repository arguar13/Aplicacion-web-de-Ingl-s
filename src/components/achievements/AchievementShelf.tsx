import { evaluateAchievements, useUnlockLog } from '@/lib/achievements'
import { cn } from '@/lib/cn'
import { formatCount, formatLongDate } from '@/lib/format'
import { useProgress } from '@/lib/progress'
import { useSettings } from '@/lib/settings'
import { Medal } from './Medal'

/** Vitrina de logros: los conseguidos con su fecha y los pendientes con su avance. */
export function AchievementShelf({ now }: { now: number }) {
  const progress = useProgress()
  const { dailyGoal } = useSettings()
  const { unlocked } = useUnlockLog()
  const all = evaluateAchievements({ progress, dailyGoal, now }, unlocked)
  const done = all.filter((s) => s.unlocked).length

  return (
    <div>
      <p className="text-[13px] text-muted">
        {formatCount(done)} de {formatCount(all.length)} conseguidos
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {all.map(({ achievement, value, target, unlocked: isUnlocked, at }) => (
          <li
            key={achievement.id}
            className={cn(
              'flex items-center gap-3.5 rounded-2xl border px-3.5 py-3',
              isUnlocked ? 'border-accent/30 bg-accent-soft/50' : 'border-line',
            )}
          >
            <Medal icon={achievement.icon} unlocked={isUnlocked} size={48} />
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[15px] font-semibold', !isUnlocked && 'text-ink/80')}>
                {achievement.title}
              </span>
              <span className="block text-[13px] leading-snug text-muted">{achievement.description}</span>
              {isUnlocked ? (
                at && <span className="mt-0.5 block text-[11px] text-accent">Conseguido el {formatLongDate(at)}</span>
              ) : (
                <span className="mt-1.5 flex items-center gap-2">
                  <span
                    role="progressbar"
                    aria-label={`Avance: ${achievement.title}`}
                    aria-valuemin={0}
                    aria-valuemax={target}
                    aria-valuenow={value}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-line"
                  >
                    <span
                      className="block h-full rounded-full bg-accent/60"
                      style={{ width: `${(value / target) * 100}%` }}
                    />
                  </span>
                  <span className="text-[11px] text-muted tabular-nums">
                    {formatCount(value)}/{formatCount(target)}
                  </span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
