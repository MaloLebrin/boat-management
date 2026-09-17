import { beforeEach, describe, expect, test, vi } from 'vitest'
import { resetInertiaMock, routerSpies } from './helpers/inertia_mock'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import { deleteVisit } from '../../inertia/utils/delete_visit'

beforeEach(() => {
  resetInertiaMock()
})

/**
 * `deleteVisit` porte désormais pour ses trois appelants — la garde native
 * `confirmDelete`, `useRowDeleteConfirmation`, `useDeleteConfirmation` — le
 * `if` qui décide du nombre d'arguments de la visite. Il n'avait que des tests
 * indirects, à travers eux ; ce qu'ils vérifiaient chacun est fixé ici.
 */
describe('deleteVisit', () => {
  test('transmet les options telles quelles', () => {
    deleteVisit('/boats/1/incidents/2', { preserveScroll: true })

    expect(routerSpies.delete).toHaveBeenCalledWith('/boats/1/incidents/2', {
      preserveScroll: true,
    })
  })

  test('sans options, la visite part sans second argument', () => {
    deleteVisit('/ports/3/pontoons/8')

    // `undefined` explicite n'est pas la même signature : les specs des écrans
    // qui ne passent pas d'options attendent l'appel à un seul argument.
    expect(routerSpies.delete).toHaveBeenCalledWith('/ports/3/pontoons/8')
    expect(routerSpies.delete.mock.calls[0]).toHaveLength(1)
  })

  test('les options vides restent un second argument', () => {
    deleteVisit('/ports/3/mouillages/4', {})

    expect(routerSpies.delete.mock.calls[0]).toEqual(['/ports/3/mouillages/4', {}])
  })
})
