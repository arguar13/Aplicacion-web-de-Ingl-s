/**
 * URL de cada pronunciación con la versión de su contenido: `audio/<id>.mp3?v=<hash>`.
 *
 * El mapa de versiones va en su propio chunk (se carga en paralelo al arrancar y el service worker
 * lo guarda como el resto de la app), así no pesa en la carga inicial.
 */
let versions: Promise<Readonly<Record<string, string>>> | null = null

export function loadAudioVersions(): Promise<Readonly<Record<string, string>>> {
  versions ??= import('virtual:audio-versions').then((module) => module.default)
  return versions
}

/** URL absoluta, igual a la que usa el service worker como clave de caché. */
export function versionedAudioUrl(id: string, all: Readonly<Record<string, string>>): string {
  const version = all[id]
  const path = `${import.meta.env.BASE_URL}audio/${id}.mp3${version ? `?v=${version}` : ''}`
  return new URL(path, location.href).href
}

export async function audioUrl(id: string): Promise<string> {
  return versionedAudioUrl(id, await loadAudioVersions())
}
