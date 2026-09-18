import { describe, expect, test, vi } from 'vitest'
import { mountWithStubs } from './helpers/mount'
import type { SpotRow } from '../../inertia/types/port'
import { ROLE_PERMISSIONS } from '../../shared/types/permissions'
import type { OrgRole } from '../../shared/types/organization'

/**
 * Le gestionnaire de places ne propose que ce que la route acceptera (#719).
 *
 * Avant, les quatre boutons s'affichaient pour tout le monde : un member
 * cliquait « supprimer », était éjecté vers l'accueil marketing, et ne voyait
 * même pas le refus. Chaque bouton suit désormais la capacité que sa route lit,
 * et le test s'appuie sur la vraie matrice `ROLE_PERMISSIONS` — une capacité
 * déplacée d'un rôle à l'autre se verra ici.
 */
vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import SpotsManager from '../../inertia/components/ports/show/SpotsManager.vue'

const spot = { id: 5, name: 'A1', positionX: null, positionY: null, boat: null } as SpotRow

function mountAs(role: OrgRole) {
  return mountWithStubs(SpotsManager, {
    props: { portId: 3, pontoonId: 4, spots: [spot], boats: [] } as Record<string, unknown>,
    pageProps: { permissions: { role, capabilities: [...ROLE_PERMISSIONS[role]] } },
    stubs: {
      SpotFormModal: { template: '<div />' },
      BoatAssignModal: { template: '<div />' },
    },
  })
}

/** Les libellés des boutons rendus — les icônes portent le leur en `sr-only`. */
function buttonLabels(role: OrgRole): string[] {
  const w = mountAs(role)
  const labels = w.findAll('button').map((b) => b.text().trim())
  w.unmount()
  return labels
}

describe('SpotsManager — boutons gardés par capacité (#719)', () => {
  test('un admin a les quatre actions', () => {
    expect(buttonLabels('admin')).toEqual([
      'ports.spots.add',
      'ports.spots.assign',
      'common.edit',
      'common.delete',
    ])
  })

  test('un member crée, amarre et renomme, mais ne supprime pas', () => {
    expect(buttonLabels('member')).toEqual(['ports.spots.add', 'ports.spots.assign', 'common.edit'])
  })

  test.each<OrgRole>(['mechanic', 'boat_owner'])('un %s ne voit aucune action', (role) => {
    expect(buttonLabels(role)).toEqual([])
  })

  test('la liste des places reste lisible sans aucune capacité', () => {
    const w = mountAs('boat_owner')
    expect(w.text()).toContain('A1')
    w.unmount()
  })
})
