import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui/Button'
import { Toast } from './ui/Toast'

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

  if (needRefresh) {
    return (
      <Toast
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
              Luego
            </Button>
            <Button variant="primary" size="sm" onClick={() => void updateServiceWorker(true)}>
              Actualizar
            </Button>
          </>
        }
      >
        Hay una versión nueva de Tecla.
      </Toast>
    )
  }
  return offlineReady ? <Toast>Lista para usar sin conexión.</Toast> : null
}
