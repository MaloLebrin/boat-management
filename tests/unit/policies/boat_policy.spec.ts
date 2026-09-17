import { test } from '@japa/runner'
import BoatPolicy from '#policies/boat_policy'
import { ORG_ID, OTHER_ORG_ID, orgResource, testPolicyMatrix } from '#tests/support/policy_matrix'
import { userWithCapabilities } from '#tests/support/policy_user'

/**
 * Bateaux — la policy la plus appelée du produit (74 appels en contrôleur) (#690).
 *
 * Deux particularités : `view` accepte un bateau optionnel (la liste n'en a
 * pas), et `deleteReservation` est la seule action du dépôt à porter une
 * **règle métier** en plus des deux gardes habituelles — une réservation
 * confirmée ne se supprime pas, même par un admin.
 */

testPolicyMatrix('BoatPolicy (unit)', () => new BoatPolicy(), [
  {
    name: 'create',
    capability: 'boats.create',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'edit',
    capability: 'boats.edit',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'manage',
    capability: 'boats.manage',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'boats.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])

test.group('BoatPolicy — optional boat on view (unit)', () => {
  test('view without a boat checks the capability alone', async ({ assert }) => {
    const policy = new BoatPolicy()

    assert.isTrue(await policy.view(userWithCapabilities(ORG_ID, ['boats.view'])))
    assert.isFalse(await policy.view(userWithCapabilities(ORG_ID, [])))
  })

  test('view denies a boat from another organization', async ({ assert }) => {
    const policy = new BoatPolicy()
    const user = userWithCapabilities(ORG_ID, ['boats.view'])

    assert.isTrue(await policy.view(user, orgResource(ORG_ID) as never))
    assert.isFalse(await policy.view(user, orgResource(OTHER_ORG_ID) as never))
  })
})

test.group('BoatPolicy — deleteReservation business rule (unit)', () => {
  const boat = orgResource(ORG_ID) as never
  const reservation = (status: string) => ({ status }) as never

  test('allows deleting a pending reservation', async ({ assert }) => {
    const policy = new BoatPolicy()
    const user = userWithCapabilities(ORG_ID, ['boats.reservations.delete'])

    assert.isTrue(await policy.deleteReservation(user, boat, reservation('pending')))
  })

  test('refuses a confirmed reservation even with the capability', async ({ assert }) => {
    const policy = new BoatPolicy()
    const user = userWithCapabilities(ORG_ID, ['boats.reservations.delete'])

    // La règle métier tranche en dernier : un engagement pris avec un client ne
    // s'efface pas, il s'annule — et le service ne la rejoue pas, la policy est
    // le seul garde.
    //
    // ⚠️ Un admin, lui, la contourne en production : `before()` court-circuite
    // la méthode avant qu'elle ne s'exécute. C'est le comportement voulu
    // (`docs/domain/auth-acl.md` : « un **member** ne peut supprimer que les
    // réservations non confirmées »), mais ce test ne le démontre pas — il
    // appelle la policy en direct, donc hors du hook.
    assert.isFalse(await policy.deleteReservation(user, boat, reservation('confirmed')))
  })

  test('refuses a foreign boat before looking at the reservation', async ({ assert }) => {
    const policy = new BoatPolicy()
    const user = userWithCapabilities(ORG_ID, ['boats.reservations.delete'])
    const foreignBoat = orgResource(OTHER_ORG_ID) as never

    assert.isFalse(await policy.deleteReservation(user, foreignBoat, reservation('pending')))
  })

  test('refuses without the capability', async ({ assert }) => {
    const policy = new BoatPolicy()
    const user = userWithCapabilities(ORG_ID, [])

    assert.isFalse(await policy.deleteReservation(user, boat, reservation('pending')))
  })
})
