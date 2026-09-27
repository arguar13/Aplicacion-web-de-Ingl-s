import { useEffect } from 'react'
import { useProgress } from '@/lib/progress'
import { requestProtection } from '@/lib/safekeeping'

/**
 * En cuanto hay progreso que perder, pide al navegador que no lo borre para liberar espacio. Solo
 * donde se concede sin preguntar (ver requestProtection); en Firefox queda el botón de Ajustes.
 */
export function useProtectOnceThereIsProgress() {
  const hasProgress = Object.keys(useProgress().cards).length > 0
  useEffect(() => {
    if (hasProgress) void requestProtection({ interactive: false })
  }, [hasProgress])
}
