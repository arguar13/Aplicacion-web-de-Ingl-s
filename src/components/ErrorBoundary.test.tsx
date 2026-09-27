// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

let shouldThrow = true
function Fragile() {
  if (shouldThrow) throw new Error('fallo de prueba')
  return <p>Todo bien</p>
}

afterEach(() => {
  cleanup()
  shouldThrow = true
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('muestra la pantalla de error en vez de dejar la página en blanco', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Algo se trabó' })).toBeTruthy()
    expect(screen.getByText('fallo de prueba')).toBeTruthy()
  })

  it('reintentar vuelve a pintar el contenido cuando el fallo desaparece', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    )
    shouldThrow = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByText('Todo bien')).toBeTruthy()
  })

  it('ir al inicio ejecuta la salida y se recupera', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onGoHome = vi.fn<() => void>(() => {
      shouldThrow = false
    })
    render(
      <ErrorBoundary onGoHome={onGoHome}>
        <Fragile />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }))
    expect(onGoHome).toHaveBeenCalledOnce()
    expect(screen.getByText('Todo bien')).toBeTruthy()
  })

  it('se reinicia al cambiar de pantalla', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(
      <ErrorBoundary resetKey="a">
        <Fragile />
      </ErrorBoundary>,
    )
    shouldThrow = false
    rerender(
      <ErrorBoundary resetKey="b">
        <Fragile />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Todo bien')).toBeTruthy()
  })
})
