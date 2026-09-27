import { describe, expect, it } from 'vitest'
import { ALL_DECK, LEVELS } from './decks'
import { formatHash, HOME, parseHash, type Route } from './routes'

describe('rutas', () => {
  it('reconoce el inicio con o sin hash', () => {
    for (const hash of ['', '#', '#/', '#//']) expect(parseHash(hash)).toEqual(HOME)
  })

  it('reconoce cada nivel y el mazo completo', () => {
    for (const deck of LEVELS) {
      expect(parseHash(`#/nivel/${deck.level}`)).toEqual({ screen: { name: 'deck', deck }, panel: null })
    }
    expect(parseHash('#/todas/')).toEqual({ screen: { name: 'deck', deck: ALL_DECK }, panel: null })
  })

  it('reconoce el panel de ajustes sobre cualquier pantalla', () => {
    expect(parseHash('#/?panel=ajustes')).toEqual({ ...HOME, panel: 'settings' })
    expect(parseHash('#/nivel/2?panel=ajustes').panel).toBe('settings')
    expect(parseHash('#/nivel/2?panel=otro').panel).toBeNull()
  })

  it('lo desconocido lleva al inicio', () => {
    for (const hash of ['#/nivel/99', '#/nivel/abc', '#/cualquier-cosa', '#nivel/1'])
      expect(parseHash(hash)).toEqual(HOME)
  })

  it('formatear y volver a leer da la misma ruta', () => {
    const routes: Route[] = [
      HOME,
      { ...HOME, panel: 'settings' },
      ...[...LEVELS, ALL_DECK].map((deck): Route => ({ screen: { name: 'deck', deck }, panel: null })),
      { screen: { name: 'deck', deck: ALL_DECK }, panel: 'settings' },
      { screen: { name: 'smart', kind: 'review' }, panel: null },
      { screen: { name: 'smart', kind: 'hard' }, panel: 'settings' },
      { screen: { name: 'blitz' }, panel: null },
      { screen: { name: 'stats' }, panel: 'settings' },
    ]
    for (const route of routes) expect(parseHash(formatHash(route))).toEqual(route)
  })
})
