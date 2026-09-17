import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Contrat des pages d'organisation et du portail propriétaire (#689).
 *
 * Le portail propriétaire est le seul espace du produit servi à un rôle qui n'a
 * **aucune** capability (`BOAT_OWNER_CAPABILITIES` est vide) : son accès repose
 * entièrement sur le rattachement `boat_owners`. Un test qui oublierait de
 * rattacher le bateau serait redirigé vers `/owner/boats`, suivi, et rendrait
 * un 200 sur la liste — l'épinglage du composant est ce qui le distingue.
 */

test.group('Organization pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /organization/members renders organization/members', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/organization/members').loginAs(user).withInertia(),
      'organization/members'
    )
  })

  test('GET /crew renders organization/crew', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/crew').loginAs(user).withInertia(),
      'organization/crew'
    )
  })

  test('GET /owner/boats renders owner/boats/index', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    assertPageContract(
      assert,
      await client.get('/owner/boats').loginAs(owner).withInertia(),
      'owner/boats/index'
    )
  })

  test('GET /owner/boats/:id renders owner/boats/show', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])
    await BoatMaintenanceEventFactory.merge({ boatId: boat.id }).create()

    assertPageContract(
      assert,
      await client.get(`/owner/boats/${boat.id}`).loginAs(owner).withInertia(),
      'owner/boats/show'
    )
  })
})
