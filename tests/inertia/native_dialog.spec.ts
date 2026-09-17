import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { resetInertiaMock, routerSpies } from './helpers/inertia_mock'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import { confirmDelete, confirmed, notify } from '../../inertia/utils/native_dialog'

let answers: boolean[] = []
let asked: string[] = []

let notified: string[] = []

function stubAlert() {
  notified = []
  vi.stubGlobal(
    'alert',
    vi.fn((message: string) => {
      notified.push(message)
    })
  )
}

function stubConfirm(answer: boolean) {
  asked = []
  answers = []
  vi.stubGlobal(
    'confirm',
    vi.fn((message: string) => {
      asked.push(message)
      answers.push(answer)
      return answer
    })
  )
}

beforeEach(() => {
  resetInertiaMock()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('confirmed', () => {
  test('rend la réponse de la confirmation native, avec le message demandé', () => {
    stubConfirm(true)
    expect(confirmed('Supprimer ?')).toBe(true)

    stubConfirm(false)
    expect(confirmed('Supprimer ?')).toBe(false)
    expect(asked).toEqual(['Supprimer ?'])
  })

  test('hors navigateur, rien n’est confirmé', () => {
    stubConfirm(true)
    vi.stubGlobal('window', undefined)

    expect(confirmed('Supprimer ?')).toBe(false)
    expect(asked).toEqual([])
  })
})

describe('confirmDelete', () => {
  test('un refus n’envoie aucune visite', () => {
    stubConfirm(false)

    confirmDelete('Supprimer ?', '/boats/1/incidents/2', { preserveScroll: true })

    expect(asked).toEqual(['Supprimer ?'])
    expect(routerSpies.delete).not.toHaveBeenCalled()
  })

  test('une confirmation supprime avec les options transmises telles quelles', () => {
    stubConfirm(true)

    confirmDelete('Supprimer ?', '/boats/1/incidents/2', { preserveScroll: true })

    expect(routerSpies.delete).toHaveBeenCalledWith('/boats/1/incidents/2', {
      preserveScroll: true,
    })
  })

  test('sans options, la visite part sans second argument', () => {
    stubConfirm(true)

    confirmDelete('Supprimer ?', '/ports/3/pontoons/8')

    // Les deux cartes de port n'en passaient pas : la signature reste la leur.
    expect(routerSpies.delete).toHaveBeenCalledWith('/ports/3/pontoons/8')
  })

  test('hors navigateur, aucune suppression ne part', () => {
    stubConfirm(true)
    vi.stubGlobal('window', undefined)

    confirmDelete('Supprimer ?', '/boats/1/incidents/2', { preserveScroll: true })

    expect(routerSpies.delete).not.toHaveBeenCalled()
  })
})

describe('notify', () => {
  test('passe le message au dialogue natif', () => {
    stubAlert()

    notify('Un bateau est encore amarré.')

    expect(notified).toEqual(['Un bateau est encore amarré.'])
  })

  test('hors navigateur, rien n’est affiché — et rien ne lève', () => {
    stubAlert()
    vi.stubGlobal('window', undefined)

    expect(() => notify('Un bateau est encore amarré.')).not.toThrow()
    expect(notified).toEqual([])
  })
})
