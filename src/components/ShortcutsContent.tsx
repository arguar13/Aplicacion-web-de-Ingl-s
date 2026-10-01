import { Kbd } from './ui/Kbd'

interface Shortcut {
  keys: string[]
  /** Entre teclas alternativas ("1 – 4") o combinadas. */
  separator?: string
  action: string
}

const GROUPS: Array<{ title: string; shortcuts: Shortcut[] }> = [
  {
    title: 'En cualquier pantalla',
    shortcuts: [
      { keys: ['?'], action: 'Ver estos atajos' },
      { keys: ['Esc'], action: 'Cerrar o volver' },
    ],
  },
  {
    title: 'Inicio',
    shortcuts: [
      { keys: ['Enter'], action: 'Sesión inteligente' },
      { keys: ['1', '9'], separator: '–', action: 'Abrir un nivel' },
      { keys: ['0'], action: 'Todas las palabras' },
      { keys: ['R'], action: 'Repaso del día' },
      { keys: ['D'], action: 'Mis difíciles' },
      { keys: ['F'], action: 'Favoritas' },
    ],
  },
  {
    title: 'Partida',
    shortcuts: [
      { keys: ['1', '4'], separator: '–', action: 'Elegir una respuesta' },
      { keys: ['Espacio'], action: 'Volver a escuchar' },
      { keys: ['L'], action: 'Escuchar despacio' },
      { keys: ['E'], action: 'Ver el ejemplo tras responder' },
      { keys: ['Enter'], action: 'Continuar' },
    ],
  },
  {
    title: 'Tarjetas',
    shortcuts: [
      { keys: ['Enter'], action: 'Mostrar la traducción' },
      { keys: ['1', '4'], separator: '–', action: 'Calificarte: otra vez, difícil, bien, fácil' },
    ],
  },
  {
    title: 'Escribir y dictado',
    shortcuts: [{ keys: ['Enter'], action: 'Comprobar lo escrito y continuar' }],
  },
  {
    title: 'Relámpago',
    shortcuts: [
      { keys: ['Enter'], action: 'Empezar (y otra vez al terminar)' },
      { keys: ['1', '4'], separator: '–', action: 'Responder' },
    ],
  },
]

/** La lista de atajos (se carga al abrir el panel: no pesa en el arranque). */
export function ShortcutsContent() {
  return (
    <>
      <p className="mt-1 text-sm text-muted">
        Con teclado, todo está a una tecla. Las cifras de las teclas de respuesta son su atajo.
      </p>
      {GROUPS.map((group) => (
        <section key={group.title} aria-label={group.title} className="mt-5">
          <h3 className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase">{group.title}</h3>
          <dl className="mt-2 divide-y divide-line">
            {group.shortcuts.map((shortcut) => (
              <div key={shortcut.action} className="flex items-center justify-between gap-4 py-2 text-sm">
                <dt>{shortcut.action}</dt>
                <dd className="flex shrink-0 items-center gap-1 text-muted">
                  {shortcut.keys.map((key, index) => (
                    <span key={key} className="flex items-center gap-1">
                      {index > 0 && <span aria-hidden>{shortcut.separator ?? 'o'}</span>}
                      <Kbd always>{key}</Kbd>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  )
}
