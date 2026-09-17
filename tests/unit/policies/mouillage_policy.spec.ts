import { test } from '@japa/runner'
import MouillagePolicy from '#policies/mouillage_policy'
import {
  ORG_ID,
  OTHER_ORG_ID,
  portScopedResource,
  testPolicyMatrix,
} from '#tests/support/policy_matrix'
import { userWithCapabilities } from '#tests/support/policy_user'

/**
 * Mouillages : la seule policy dont le scope organisationnel passe par une
 * **relation** (#690).
 *
 * `Mouillage` n'a pas de colonne `organization_id` (`app/models/mouillage.ts`) :
 * il appartient à un `Port`, qui appartient à l'organisation. `sameOrgViaPort`
 * lit donc `mouillage.port.organizationId` — ce qui n'existe que si l'appelant
 * a préchargé la relation.
 *
 * Toutes les actions sauf `create` sont admin-only : `mouillages.create/edit/delete`
 * figurent dans `ADMIN_ONLY_CAPABILITIES`, seul `mouillages.view` est ouvert
 * aux membres.
 */

testPolicyMatrix('MouillagePolicy (unit)', () => new MouillagePolicy(), [
  {
    name: 'view',
    capability: 'mouillages.view',
    resource: portScopedResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'create',
    capability: 'mouillages.create',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'edit',
    capability: 'mouillages.edit',
    resource: portScopedResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'mouillages.delete',
    resource: portScopedResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])

test.group('MouillagePolicy — port relation (unit)', () => {
  test('denies every scoped action when the port relation is not preloaded', async ({ assert }) => {
    const policy = new MouillagePolicy()
    const user = userWithCapabilities(ORG_ID, [
      'mouillages.view',
      'mouillages.edit',
      'mouillages.delete',
    ])
    // Un mouillage chargé sans son port : `sameOrgViaPort` ne peut rien
    // conclure et refuse. Un jour où `port` deviendrait une colonne, ce test
    // tomberait — et c'est bien ce qu'on veut savoir.
    const orphanMouillage = { portId: 3 } as never

    assert.isFalse(await policy.view(user, orphanMouillage))
    assert.isFalse(await policy.edit(user, orphanMouillage))
    assert.isFalse(await policy.delete(user, orphanMouillage))
  })

  test('reads the organization from the port, not from the mouillage', async ({ assert }) => {
    const policy = new MouillagePolicy()
    const user = userWithCapabilities(ORG_ID, ['mouillages.view'])
    // `organizationId` posé directement sur le mouillage est un leurre : la
    // policy ne doit lire que celui du port. Sans ça, une ressource mal
    // hydratée ouvrirait l'accès sur une valeur qui ne fait pas autorité.
    const decoy = { organizationId: ORG_ID, port: { organizationId: OTHER_ORG_ID } } as never

    assert.isFalse(await policy.view(user, decoy))
  })
})
