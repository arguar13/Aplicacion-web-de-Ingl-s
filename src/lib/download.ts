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
