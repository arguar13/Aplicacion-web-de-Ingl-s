import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './index.css'
import App from './App'
import { initTheme } from './lib/theme'

initTheme()

const container = document.getElementById('root')
if (!container) throw new Error('Falta el elemento #root en index.html')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
