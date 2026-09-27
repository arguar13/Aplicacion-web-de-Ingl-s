import { describe, expect, it } from 'vitest'
import { runPool } from './pool'

const tick = () => new Promise((resolve) => setTimeout(resolve, 1))

describe('runPool', () => {
  it('procesa todos los elementos sin pasar del límite de concurrencia', async () => {
    let running = 0
    let peak = 0
    const done: number[] = []
    await runPool(
      Array.from({ length: 20 }, (_, i) => i),
      3,
      async (i) => {
        running++
        peak = Math.max(peak, running)
        await tick()
        done.push(i)
        running--
      },
    )
    expect(done.toSorted((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i))
    expect(peak).toBe(3)
  })

  it('deja de empezar tareas al cancelar', async () => {
    const controller = new AbortController()
    const done: number[] = []
    await runPool(
      Array.from({ length: 50 }, (_, i) => i),
      2,
      async (i) => {
        await tick()
        done.push(i)
        if (done.length === 4) controller.abort()
      },
      controller.signal,
    )
    expect(done.length).toBeLessThan(10)
  })

  it('con una lista vacía termina sin hacer nada', async () => {
    await expect(runPool([], 4, () => Promise.reject(new Error('no debería llamarse')))).resolves.toBeUndefined()
  })
})
