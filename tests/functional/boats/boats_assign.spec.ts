import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Boat from '#models/boat'
import { BoatFactory } from '#database/factories/boat_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { SpotFactory } from '#database/factories/spot_factory'
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

  test('PATCH /boats/:id/assignment rejects spot already occupied by another boat', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const spot = await makeSpot(user.organizationId!)
    const occupant = await BoatFactory.merge({
      organizationId: user.organizationId!,
      spotId: spot.id,
    }).create()
    const intruder = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .patch(`/boats/${intruder.id}/assignment`)
      .loginAs(user)
      .form({ spotId: spot.id })
      .redirects(0)

    response.assertStatus(302)

    const updated = await Boat.findOrFail(intruder.id)
    assert.isNull(updated.spotId)

    const occupantStillThere = await Boat.findOrFail(occupant.id)
    assert.equal(occupantStillThere.spotId, spot.id)
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
})
