import { test } from '@japa/runner'
import SimulatorPolicy from '#policies/simulator_policy'
import { ORG_ID } from '#tests/support/policy_matrix'
import { orphanUser, policyUser, userWithCapabilities } from '#tests/support/policy_user'

/**
 * Simulateur (#690).
 *
 * La seule policy du dépôt qui n'hérite **pas** d'`OrgScopedPolicy` : elle
 * étend `BasePolicy` directement, n'a donc ni `sameOrg`, ni `can`, ni le hook
 * `before()`. Elle ne passe pas par la matrice partagée.
 *
 * Deux méthodes que tout oppose :
 * - `viewShare` est **synchrone** et rend `true` sans condition — un partage de
 *   simulation est public par construction, c'est son jeton d'URL qui fait
 *   l'autorisation, pas la policy ;
 * - `manageLeads` appelle `user.hasPermission` en direct.
 */

test.group('SimulatorPolicy — viewShare is public (unit)', () => {
  test('grants an anonymous visitor', ({ assert }) => {
    const policy = new SimulatorPolicy()
    // Synchrone : pas d'`await`. Un `await` masquerait une régression qui la
    // rendrait asynchrone, puisqu'une Promise est toujours truthy.
    assert.isTrue(policy.viewShare(null, {} as never))
  })

  test('grants a user from an unrelated organization', ({ assert }) => {
    const policy = new SimulatorPolicy()
    const outsider = policyUser(999, 'boat_owner')

    assert.isTrue(policy.viewShare(outsider, {} as never))
  })
})

test.group('SimulatorPolicy — manageLeads (unit)', () => {
  test('requires simulator.manage_leads', async ({ assert }) => {
    const policy = new SimulatorPolicy()

    assert.isTrue(
      await policy.manageLeads(userWithCapabilities(ORG_ID, ['simulator.manage_leads']))
    )
    assert.isFalse(await policy.manageLeads(userWithCapabilities(ORG_ID, [])))
  })

  test('is admin-only', async ({ assert }) => {
    const policy = new SimulatorPolicy()

    assert.isTrue(await policy.manageLeads(policyUser(ORG_ID, 'admin')))
    assert.isFalse(await policy.manageLeads(policyUser(ORG_ID, 'member')))
    assert.isFalse(await policy.manageLeads(policyUser(ORG_ID, 'mechanic')))
    assert.isFalse(await policy.manageLeads(policyUser(ORG_ID, 'boat_owner')))
  })

  test('denies a user without an organization', async ({ assert }) => {
    const policy = new SimulatorPolicy()

    assert.isFalse(await policy.manageLeads(orphanUser(['simulator.manage_leads'])))
  })
})
