import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { cn } from '@/lib/cn'

/** Avisos del service worker: nueva versión disponible y app lista para usar sin conexión. */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      role="status"
      className={cn(
        'fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm animate-rise items-center gap-3',
        'rounded-2xl border border-line bg-raised py-3 pr-3 pl-4 text-sm shadow-[0_12px_40px_-12px_rgb(0_0_0/0.3)]',
      )}
    >
      <span className="flex-1">
        {needRefresh ? 'Hay una versión nueva de Tecla.' : 'Lista para usar sin conexión.'}
      </span>
      {needRefresh && (
        <>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="h-8 cursor-pointer rounded-full px-3 font-medium text-muted hover:text-ink"
          >
            Luego
          </button>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="h-8 cursor-pointer rounded-full bg-accent px-4 font-semibold text-accent-ink hover:brightness-110"
          >
            Actualizar
          </button>
        </>
      )}
    </div>
  )
}
