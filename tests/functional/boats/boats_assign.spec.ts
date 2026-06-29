import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Boat from '#models/boat'
import { BoatFactory } from '#database/factories/boat_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'

async function makeSpot(organizationId: number) {
  const pontoon = await PontoonFactory.with('port', 1, (p) => p.merge({ organizationId })).create()
  return SpotFactory.merge({ organizationId, pontoonId: pontoon.id }).create()
}

test.group('Boats assign (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PATCH /boats/:id/assignment assigns a free spot to a boat', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const spot = await makeSpot(user.organizationId!)

    const response = await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    response.assertStatus(302)

    const updated = await Boat.findOrFail(boat.id)
    assert.equal(updated.spotId, spot.id)
  })

  test('PATCH /boats/:id/assignment evicts previous occupant when spot is taken', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const spot = await makeSpot(user.organizationId!)
    const occupant = await BoatFactory.merge({
      organizationId: user.organizationId!,
      spotId: spot.id,
    }).create()
    const newBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .patch(`/boats/${newBoat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    response.assertStatus(302)

    const updated = await Boat.findOrFail(newBoat.id)
    assert.equal(updated.spotId, spot.id)

    const evicted = await Boat.findOrFail(occupant.id)
    assert.isNull(evicted.spotId)
  })

  test('PATCH /boats/:id/assignment allows reassigning boat to its current spot', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const spot = await makeSpot(user.organizationId!)
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      spotId: spot.id,
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    response.assertStatus(302)

    const updated = await Boat.findOrFail(boat.id)
    assert.equal(updated.spotId, spot.id)
  })

  test('POST /boats evicts previous occupant when creating a boat on an occupied spot', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const spot = await makeSpot(user.organizationId!)
    const occupant = await BoatFactory.merge({
      organizationId: user.organizationId!,
      spotId: spot.id,
    }).create()

    const response = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Nouveau bateau', spotId: spot.id })
      .redirects(0)

    response.assertStatus(302)

    const evicted = await Boat.findOrFail(occupant.id)
    assert.isNull(evicted.spotId)
  })

  test('PATCH /boats/:id/assignment unassigns spot when spotId is null', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const spot = await makeSpot(user.organizationId!)
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      spotId: spot.id,
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: '' })
      .redirects(0)

    response.assertStatus(302)

    const updated = await Boat.findOrFail(boat.id)
    assert.isNull(updated.spotId)
  })

  test('POST /boats rejects cross-org spotId on creation', async ({ client, assert }) => {
    const user = await createAdminUser()
    const otherUser = await UserFactory.with('organization').create()
    const foreignSpot = await makeSpot(otherUser.organizationId!)

    const response = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Pirate', propulsionType: 'motorboat', spotId: foreignSpot.id })
      .redirects(0)

    response.assertStatus(302)

    const boat = await Boat.findBy('name', 'Pirate')
    assert.isNull(boat)
  })

  test('PUT /boats/:id rejects cross-org spotId on update', async ({ client, assert }) => {
    const user = await createAdminUser()
    const ownSpot = await makeSpot(user.organizationId!)
    const otherUser = await UserFactory.with('organization').create()
    const foreignSpot = await makeSpot(otherUser.organizationId!)
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Pirate',
      spotId: ownSpot.id,
    }).create()

    const response = await client
      .put(`/boats/${boat.id}`)
      .loginAs(user)
      .form({ name: 'Pirate', propulsionType: 'motorboat', spotId: foreignSpot.id })
      .redirects(0)

    response.assertStatus(302)

    const updated = await Boat.findOrFail(boat.id)
    assert.equal(updated.spotId, ownSpot.id)
  })
})
