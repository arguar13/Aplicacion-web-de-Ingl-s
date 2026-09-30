import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/geist'
import './index.css'
import { ErrorBoundary, ErrorScreen } from './components/ErrorBoundary'
import { initTheme } from './lib/theme'
import { loadVocabulary } from './lib/vocabulary'

initTheme()

const container = document.getElementById('root')
if (!container) throw new Error('Falta el elemento #root en index.html')
const root = createRoot(container)

// Mientras llega el vocabulario se ve la pantalla de arranque de index.html. La app se importa
// después: sus módulos usan el vocabulario al cargarse (ya descargados en paralelo, ver
// vite/startup-preload.ts).
try {
  await loadVocabulary()
  const { default: App } = await import('./App')
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
} catch (error) {
  // Sin conexión en la primera visita (aún no hay nada guardado) o un despliegue a medias.
  root.render(
    <ErrorScreen error={error instanceof Error ? error : new Error(String(error))} onRetry={() => location.reload()} />,
  )
}
