import { describe, expect, it } from 'vitest'
import { LEVELS } from './decks'
import {
  answerPlacement,
  PASS_MARK,
  type PlacementState,
  placementItems,
  placementProgress,
  startPlacement,
} from './placement'

/** Responde la prueba: `knows(level)` dice si se acierta en ese nivel. Cuenta las preguntas. */
function run(knows: (level: number) => boolean): PlacementState & { asked: number } {
  let state = startPlacement()
  let asked = 0
  for (; state.result === null && asked < 200; asked++) {
    const item = state.items[state.step]
    state = answerPlacement(state, knows(item.level) ? item.word.id : null)
  }
  return { ...state, asked }
}

describe('prueba de nivel', () => {
  it('usa palabras de contenido del nivel, siempre las mismas', () => {
    const a = placementItems(LEVELS[2]).map((i) => i.word.id)
    const b = placementItems(LEVELS[2]).map((i) => i.word.id)
    expect(a).toEqual(b)
    expect(placementItems(LEVELS[2]).every((i) => ['noun', 'verb', 'adj', 'adv'].includes(i.word.pos))).toBe(true)
    expect(placementItems(LEVELS[2]).every((i) => i.options.includes(i.word))).toBe(true)
  })

  it('recomienda el primer nivel que no se supera, sea cual sea', () => {
    for (let known = 0; known <= LEVELS.length; known++) {
      const expected = Math.min(known + 1, LEVELS.length)
      expect(run((level) => level <= known).result, `sabe hasta el nivel ${known}`).toBe(expected)
    }
  })

  it('pregunta poco: quien empieza de cero, 2 palabras; nadie más de 7 niveles', () => {
    expect(run(() => false).asked).toBe(2)
    for (let known = 0; known <= LEVELS.length; known++) {
      expect(run((level) => level <= known).asked).toBeLessThanOrEqual(7 * 3)
    }
  })

  it('guarda las palabras acertadas para marcarlas como sabidas', () => {
    // Un nivel se da por superado con PASS_MARK aciertos: no se pregunta la tercera palabra.
    const state = run((level) => level <= 2)
    expect(state.known).toHaveLength(2 * PASS_MARK)
    expect(state.known.every((w) => LEVELS[0].words.includes(w) || LEVELS[1].words.includes(w))).toBe(true)
  })

  it('la barra avanza con cada respuesta y llega al final con el resultado', () => {
    let state = startPlacement()
    let previous = placementProgress(state)
    for (let i = 0; state.result === null && i < 200; i++) {
      state = answerPlacement(state, state.items[state.step].word.id)
      const now = placementProgress(state)
      expect(now).toBeGreaterThanOrEqual(previous)
      previous = now
    }
    expect(placementProgress(state)).toBe(1)
  })

  it('termina un nivel en cuanto ya no se puede superar', () => {
    let state = startPlacement()
    state = answerPlacement(state, null)
    expect(state.result).toBeNull()
    state = answerPlacement(state, null)
    expect(state.result).toBe(1)
    expect(placementProgress(state)).toBe(1)
  })
})
