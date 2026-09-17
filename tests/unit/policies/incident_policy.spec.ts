import { test } from '@japa/runner'
import IncidentPolicy from '#policies/incident_policy'
import { ORG_ID, OTHER_ORG_ID, orgResource, testPolicyMatrix } from '#tests/support/policy_matrix'
import { userWithCapabilities } from '#tests/support/policy_user'

/**
 * Avaries (#690).
 *
 * `view` accepte un bateau **optionnel** : la liste globale des avaries
 * (`/navigation`) n'en a pas, la vue par bateau si. Les deux branches méritent
 * chacune leur test — c'est exactement le genre d'argument facultatif qu'un
 * refactor transforme en argument obligatoire sans que rien ne le signale.
 */

testPolicyMatrix('IncidentPolicy (unit)', () => new IncidentPolicy(), [
  {
    name: 'create',
    capability: 'incidents.create',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'edit',
    capability: 'incidents.edit',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'incidents.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])

test.group('IncidentPolicy — optional boat on view (unit)', () => {
  test('view without a boat falls back to the capability alone', async ({ assert }) => {
    const policy = new IncidentPolicy()
    const user = userWithCapabilities(ORG_ID, ['incidents.view'])

    // La liste globale des avaries : il n'y a pas de bateau à scoper.
    assert.isTrue(await policy.view(user))
  })

  test('view without a boat is still denied without the capability', async ({ assert }) => {
    const policy = new IncidentPolicy()
    const user = userWithCapabilities(ORG_ID, [])

    assert.isFalse(await policy.view(user))
  })

  test('view with a boat guards its organization', async ({ assert }) => {
    const policy = new IncidentPolicy()
    const user = userWithCapabilities(ORG_ID, ['incidents.view'])

    assert.isTrue(await policy.view(user, orgResource(ORG_ID) as never))
    assert.isFalse(await policy.view(user, orgResource(OTHER_ORG_ID) as never))
  })
})
