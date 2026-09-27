/**
 * Ejecuta `task` sobre cada elemento con, como mucho, `concurrency` tareas a la vez.
 * Si `signal` se cancela, no empieza tareas nuevas y espera a que terminen las que están en curso.
 */
export async function runPool<T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0
  const worker = async (): Promise<void> => {
    if (next >= items.length || signal?.aborted) return
    await task(items[next++])
    return worker()
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
}
