import { Component, type ErrorInfo, type ReactNode } from 'react'
import { LogoMark } from './icons'
import { Button } from './ui/Button'
import { Surface } from './ui/Surface'

interface Props {
  children: ReactNode
  /** Al cambiar (p. ej. de pantalla), se olvida el error y se vuelve a intentar pintar. */
  resetKey?: string
  /** Acción para salir del error hacia un lugar seguro; si falta, solo se ofrece reintentar. */
  onGoHome?: () => void
}

interface State {
  error: Error | null
}

/**
 * Si algo falla al pintar, muestra una pantalla de error en vez de dejar la página en blanco.
 * El progreso no corre peligro: se guarda con cada respuesta, fuera del árbol de React.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error al pintar la interfaz', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset()
  }

  reset = () => this.setState({ error: null })

  goHome = () => {
    this.props.onGoHome?.()
    this.reset()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return <ErrorScreen error={error} onRetry={this.reset} onGoHome={this.props.onGoHome ? this.goHome : undefined} />
  }
}

export function ErrorScreen({
  error,
  onRetry,
  onGoHome,
}: {
  error: Error
  onRetry: () => void
  onGoHome?: () => void
}) {
  return (
    <main role="alert" className="grid flex-1 place-items-center px-4 py-16 sm:px-6">
      <Surface className="w-full max-w-md animate-rise px-6 py-9 text-center sm:px-9">
        <LogoMark width={44} height={44} className="mx-auto -rotate-6" />
        <h1 className="mt-5 font-display text-4xl leading-tight">Algo se trabó</h1>
        <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
          Tu progreso está a salvo: se guarda con cada respuesta. Vuelve a intentarlo y, si se repite, recarga la
          página.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" onClick={onRetry}>
            Reintentar
          </Button>
          {onGoHome ? (
            <Button size="lg" onClick={onGoHome}>
              Ir al inicio
            </Button>
          ) : (
            <Button size="lg" onClick={() => location.reload()}>
              Recargar
            </Button>
          )}
        </div>
        <details className="mt-7 text-left text-xs text-muted">
          <summary className="cursor-pointer text-center font-medium select-none hover:text-ink">
            Detalles técnicos
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-bg p-3 font-mono whitespace-pre-wrap text-ink/80">
            {error.message || error.name}
          </pre>
        </details>
      </Surface>
    </main>
  )
}
