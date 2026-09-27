import { describe, expect, it } from 'vitest'
import { LEVELS } from './decks'
import { answerPlacement, type PlacementState, placementItems, placementProgress, startPlacement } from './placement'

/** Responde la prueba: `knows(level)` dice si se acierta en ese nivel. */
function run(knows: (level: number) => boolean): PlacementState {
  let state = startPlacement()
  for (let guard = 0; state.result === null && guard < 100; guard++) {
    const item = state.items[state.step]
    state = answerPlacement(state, knows(item.level) ? item.word.id : null)
  }
  return state
}

describe('prueba de nivel', () => {
  it('usa palabras de contenido del nivel, siempre las mismas', () => {
    const a = placementItems(LEVELS[2]).map((i) => i.word.id)
    const b = placementItems(LEVELS[2]).map((i) => i.word.id)
    expect(a).toEqual(b)
    expect(placementItems(LEVELS[2]).every((i) => ['noun', 'verb', 'adj', 'adv'].includes(i.word.pos))).toBe(true)
    expect(placementItems(LEVELS[2]).every((i) => i.options.includes(i.word))).toBe(true)
  })

  it('recomienda el primer nivel que no se supera', () => {
    expect(run(() => false).result).toBe(1)
    expect(run((level) => level <= 3).result).toBe(4)
    expect(run(() => true).result).toBe(8)
  })

  it('guarda las palabras acertadas para marcarlas como sabidas', () => {
    const state = run((level) => level <= 2)
    expect(state.known).toHaveLength(6)
    expect(state.known.every((w) => LEVELS[0].words.includes(w) || LEVELS[1].words.includes(w))).toBe(true)
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
