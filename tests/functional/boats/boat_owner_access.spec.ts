import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'

test.group('Boat owner portal access (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /owner/boats lists only boats the owner is attached to', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const ownedBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await ownedBoat.related('owners').attach([owner.id])

    const response = await client.get('/owner/boats').loginAs(owner)

    response.assertStatus(200)
    const props = response.body().props
    const boatIds = props.boats.map((b: { id: number }) => b.id)
    assert.deepEqual(boatIds, [ownedBoat.id])
    assert.notInclude(boatIds, otherBoat.id)
  })

  test('GET /owner/boats/:id renders the boat for its owner', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])
    await BoatMaintenanceEventFactory.merge({ boatId: boat.id }).create()

    const response = await client.get(`/owner/boats/${boat.id}`).loginAs(owner)

    response.assertStatus(200)
    const props = response.body().props
    assert.equal(props.boat.id, boat.id)
    assert.equal(props.maintenanceEvents.length, 1)
  })

  test('GET /owner/boats/:id redirects to the list for a boat the user does not own', async ({
    client,
  }) => {
    const admin = await createAdminUser()
    const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client.get(`/owner/boats/${otherBoat.id}`).loginAs(owner).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/owner/boats')
  })

  test('GET /boats/:id (staff page) is denied to a boat_owner even for an owned boat', async ({
    client,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])

    const response = await client.get(`/boats/${boat.id}`).loginAs(owner)

    // BoatPolicy.view() only grants access via the `boats.view` capability,
    // which boat_owner never holds — access to the full staff page must stay
    // denied, ownership only unlocks the dedicated /owner/boats/:id portal.
    response.assertStatus(403)
  })

  test('GET /owner/boats requires authentication', async ({ client }) => {
    const response = await client.get('/owner/boats').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
