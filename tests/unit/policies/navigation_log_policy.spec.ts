import { test } from '@japa/runner'
import NavigationLogPolicy from '#policies/navigation_log_policy'
import { ORG_ID, OTHER_ORG_ID, orgResource, testPolicyMatrix } from '#tests/support/policy_matrix'
import { userWithCapabilities } from '#tests/support/policy_user'

/**
 * Journal de bord (#690).
 *
 * `delete` est la seule action du dépôt qui **ne prend pas de ressource** alors
 * que ses jumelles `create` et `update` en exigent une. L'asymétrie est
 * intentionnelle côté contrôleur — la suppression se fait depuis une liste déjà
 * scopée — mais elle veut dire que la policy, seule, n'isole rien sur ce
 * chemin. Le test la fixe telle quelle : si quelqu'un ajoute un argument, il
 * doit le faire en connaissance de cause.
 */

testPolicyMatrix('NavigationLogPolicy (unit)', () => new NavigationLogPolicy(), [
  {
    name: 'create',
    capability: 'navigation_logs.create',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'update',
    capability: 'navigation_logs.update',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'navigation_logs.delete',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])

test.group('NavigationLogPolicy — delete has no resource guard (unit)', () => {
  test('delete only checks the capability, never the boat', async ({ assert }) => {
    const policy = new NavigationLogPolicy()
    const user = userWithCapabilities(ORG_ID, ['navigation_logs.delete'])

    // Comportement actuel, figé volontairement : `delete(user)` ne reçoit pas
    // de bateau, donc aucune vérification `sameOrg` n'a lieu. L'isolation
    // repose entièrement sur le scoping du contrôleur en amont.
    assert.isTrue(await policy.delete(user))
  })

  test('create and update do guard the boat', async ({ assert }) => {
    const policy = new NavigationLogPolicy()
    const user = userWithCapabilities(ORG_ID, ['navigation_logs.create', 'navigation_logs.update'])
    const foreignBoat = orgResource(OTHER_ORG_ID) as never

    assert.isFalse(await policy.create(user, foreignBoat))
    assert.isFalse(await policy.update(user, foreignBoat))
  })
})
