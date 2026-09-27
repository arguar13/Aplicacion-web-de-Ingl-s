/** Tiempo que se conserva la URL del archivo: Safari la lee después de que termina el clic. */
const OBJECT_URL_LIFETIME_MS = 60_000

/** Descarga un texto como archivo con el nombre indicado. */
export function saveTextFile(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS)
}

/** Si el sistema puede compartir archivos (la hoja de compartir de iOS, Android, Windows o macOS). */
export function canShareFiles(): boolean {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'prueba.json', { type: 'application/json' })] })
    )
  } catch {
    return false
  }
}

/**
 * Abre la hoja de compartir del sistema con un texto como archivo (WhatsApp, correo, AirDrop,
 * Drive…). `cancelled` si el usuario la cerró; `failed` si el sistema no pudo compartirlo.
 */
export async function shareTextFile(
  name: string,
  text: string,
  type = 'application/json',
): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({ files: [new File([text], name, { type })], title: name })
    return 'shared'
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}
