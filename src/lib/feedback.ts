/**
 * Respuesta sensorial a lo que pasa en la partida: sonido y vibración, según los ajustes. Con
 * "reducir movimiento" en el sistema no se vibra (tampoco hay confeti: ver prefersReducedMotion).
 */
import { playEffect, type SoundEffect } from './audio'
import { getSettings } from './settings'

const VIBRATION: Record<SoundEffect, number | number[]> = {
  correct: 12,
  wrong: [20, 40, 20],
  goal: [30, 50, 30, 50, 60],
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Hay vibración de verdad: la API existe y el dispositivo es táctil (Chrome de escritorio tiene
 * `navigator.vibrate`, pero no vibra nada: el ajuste sería una promesa vacía).
 */
export const canVibrate = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.vibrate === 'function' &&
  typeof matchMedia === 'function' &&
  matchMedia('(pointer: coarse)').matches

export function feedback(effect: SoundEffect): void {
  const { sounds, haptics } = getSettings()
  if (sounds) playEffect(effect)
  if (haptics && canVibrate() && !prefersReducedMotion()) navigator.vibrate(VIBRATION[effect])
}
