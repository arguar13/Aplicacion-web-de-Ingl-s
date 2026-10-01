import { describe, expect, it } from 'vitest'
import { ALL_DECK, LEVELS } from './decks'
import { formatHash, HOME, parseHash, type Route, titleOf } from './routes'

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

  it('reconoce el curso, sus niveles, lecciones y exámenes', () => {
    expect(parseHash('#/curso').screen).toEqual({ name: 'course' })
    expect(parseHash('#/curso/a1').screen).toEqual({ name: 'courseLevel', level: 'a1' })
    expect(parseHash('#/curso/b2/examen').screen).toEqual({ name: 'exam', level: 'b2' })
    expect(parseHash('#/curso/a1/verbo-to-be').screen).toEqual({ name: 'lesson', level: 'a1', lesson: 'verbo-to-be' })
    expect(parseHash('#/curso/b1/quiz').screen).toEqual({ name: 'quiz', level: 'b1' })
    expect(parseHash('#/curso/quiz').screen).toEqual({ name: 'quiz', level: null })
    expect(formatHash({ screen: { name: 'quiz', level: null }, panel: null })).toBe('#/curso/quiz')
    expect(titleOf({ screen: { name: 'quiz', level: 'c2' }, panel: null })).toBe('Quiz C2 — OpenSpeak')
    expect(parseHash('#/curso/z9')).toEqual(HOME)
    expect(parseHash('#/curso/a1/Mal Id')).toEqual(HOME)
    expect(formatHash({ screen: { name: 'lesson', level: 'a1', lesson: 'verbo-to-be' }, panel: null })).toBe(
      '#/curso/a1/verbo-to-be',
    )
    expect(titleOf({ screen: { name: 'exam', level: 'c1' }, panel: null })).toBe('Examen C1 — OpenSpeak')
  })

  it('reconoce el panel de ajustes sobre cualquier pantalla', () => {
    expect(parseHash('#/?panel=ajustes')).toEqual({ ...HOME, panel: 'settings' })
    expect(parseHash('#/nivel/2?panel=ajustes').panel).toBe('settings')
    expect(parseHash('#/nivel/2?panel=otro').panel).toBeNull()
    expect(parseHash('#/nivel/2?panel=atajos').panel).toBe('shortcuts')
    expect(formatHash({ ...HOME, panel: 'shortcuts' })).toBe('#/?panel=atajos')
  })

  it('la ficha de una palabra solo se abre si la palabra existe', () => {
    expect(parseHash('#/diccionario?palabra=water').panel).toEqual({ word: 'water' })
    expect(parseHash('#/diccionario?palabra=no-existe').panel).toBeNull()
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
      { screen: { name: 'dictionary' }, panel: null },
      { screen: { name: 'dictionary' }, panel: { word: 'water' } },
      { screen: { name: 'deck', deck: LEVELS[0] }, panel: { word: 'the' } },
    ]
    for (const route of routes) expect(parseHash(formatHash(route))).toEqual(route)
  })
})
