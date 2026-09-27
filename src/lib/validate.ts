/** Comprobaciones para validar datos que vienen de fuera (almacenamiento, archivos importados). */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const isInteger = (value: unknown, min = -Infinity, max = Infinity): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

/** Fecha local en formato AAAA-MM-DD. */
export const isDayKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)
