import { test } from '@japa/runner'
import PortPolicy from '#policies/port_policy'
import { ORG_ID, OTHER_ORG_ID, orgResource, testPolicyMatrix } from '#tests/support/policy_matrix'
import { userWithCapabilities } from '#tests/support/policy_user'

/**
 * Ports (#690).
 *
 * `edit` et `delete` acceptent un port **optionnel** : les écrans de création
 * et les vérifications d'affichage les appellent sans ressource pour savoir
 * s'il faut montrer un bouton. Seul `ports.view` est ouvert aux membres — la
 * cartographie marina se configure par un admin.
 */

testPolicyMatrix('PortPolicy (unit)', () => new PortPolicy(), [
  {
    // Pendant de `view` sans ressource, pour la liste (#723) : `GET /ports`
    // n'a pas de port à passer.
    name: 'viewAny',
    capability: 'ports.view',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'view',
    capability: 'ports.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'create',
    capability: 'ports.create',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'edit',
    capability: 'ports.edit',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'ports.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])

test.group('PortPolicy — optional port on edit/delete (unit)', () => {
  test('edit and delete without a port check the capability alone', async ({ assert }) => {
    const policy = new PortPolicy()
    const user = userWithCapabilities(ORG_ID, ['ports.edit', 'ports.delete'])

    assert.isTrue(await policy.edit(user))
    assert.isTrue(await policy.delete(user))
  })

  test('a foreign port is refused before the capability is even read', async ({ assert }) => {
    const policy = new PortPolicy()
    // Utilisateur porteur des deux capabilities : seul le scope peut refuser.
    const user = userWithCapabilities(ORG_ID, ['ports.edit', 'ports.delete'])
    const foreignPort = orgResource(OTHER_ORG_ID) as never

    assert.isFalse(await policy.edit(user, foreignPort))
    assert.isFalse(await policy.delete(user, foreignPort))
  })
})
