import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

test.group('Boat co-ownership management (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('admin attaches a boat_owner user to a boat', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client
      .post(`/boats/${boat.id}/owners`)
      .loginAs(admin)
      .form({ userId: owner.id })
      .redirects(0)

    response.assertStatus(302)

    await boat.load('owners')
    assert.equal(boat.owners.length, 1)
    assert.equal(boat.owners[0].id, owner.id)
  })

  test('admin detaches a boat_owner user from a boat', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])

    const response = await client
      .delete(`/boats/${boat.id}/owners/${owner.id}`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    await boat.load('owners')
    assert.equal(boat.owners.length, 0)
  })

  test('cannot attach a user who does not have the boat_owner role in the organization', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client
      .post(`/boats/${boat.id}/owners`)
      .loginAs(admin)
      .form({ userId: member.id })
      .redirects(0)

    response.assertStatus(302)

    await boat.load('owners')
    assert.equal(boat.owners.length, 0)
  })

  test('a member can also manage boat co-ownership (boats.manage is shared with admin)', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const member = await createMemberUser(admin.organizationId!)
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client
      .post(`/boats/${boat.id}/owners`)
      .loginAs(member)
      .form({ userId: owner.id })
      .redirects(0)

    response.assertStatus(302)
    await boat.load('owners')
    assert.equal(boat.owners.length, 1)
  })

  test('a mechanic cannot manage boat co-ownership (no boats.manage capability)', async ({
    client,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client
      .post(`/boats/${boat.id}/owners`)
      .loginAs(mechanic)
      .form({ userId: owner.id })

    response.assertStatus(403)
  })
})
