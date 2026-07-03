import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Mouillage from '#models/mouillage'
import { BoatFactory } from '#database/factories/boat_factory'
import { PortFactory } from '#database/factories/port_factory'
import { MouillageFactory } from '#database/factories/mouillage_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { MARINA_CANVAS_HEIGHT, MARINA_CANVAS_WIDTH } from '#shared/constants/marina_layout'

test.group('Mouillages (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('DELETE /ports/:portId/mouillages/:mouillageId deletes mouillage and redirects', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()

    const response = await client
      .delete(`/ports/${port.id}/mouillages/${mouillage.id}`)
      .loginAs(user)

    response.assertRedirectsTo(`/ports/${port.id}`)
    const found = await Mouillage.find(mouillage.id)
    assert.isNull(found)
  })

  test('DELETE /ports/:portId/mouillages/:mouillageId redirects back with flash error when mouillage has boats', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()
    const spot = await SpotFactory.merge({
      mouillageId: mouillage.id,
      organizationId: user.organizationId!,
    }).create()
    await BoatFactory.merge({ organizationId: user.organizationId!, spotId: spot.id }).create()

    const response = await client
      .delete(`/ports/${port.id}/mouillages/${mouillage.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/ports/${port.id}`)
    const found = await Mouillage.find(mouillage.id)
    assert.isNotNull(found)
  })

  test('PATCH .../position accepte des coordonnées valides dans les limites du canvas', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()

    const response = await client
      .patch(`/ports/${port.id}/mouillages/${mouillage.id}/position`)
      .loginAs(user)
      .form({ x: 42, y: 84 })
      .redirects(0)

    response.assertStatus(302)
    const found = await Mouillage.findOrFail(mouillage.id)
    assert.equal(found.positionX, 42)
    assert.equal(found.positionY, 84)
  })

  test('PATCH .../position rejette des coordonnées négatives', async ({ client, assert }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()

    const response = await client
      .patch(`/ports/${port.id}/mouillages/${mouillage.id}/position`)
      .loginAs(user)
      .form({ x: -10, y: -20 })
      .redirects(0)

    response.assertStatus(302)
    const found = await Mouillage.findOrFail(mouillage.id)
    assert.isNull(found.positionX)
    assert.isNull(found.positionY)
  })

  test('PATCH .../position rejette des coordonnées hors des limites du canvas', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()

    const response = await client
      .patch(`/ports/${port.id}/mouillages/${mouillage.id}/position`)
      .loginAs(user)
      .form({ x: MARINA_CANVAS_WIDTH + 100, y: MARINA_CANVAS_HEIGHT + 100 })
      .redirects(0)

    response.assertStatus(302)
    const found = await Mouillage.findOrFail(mouillage.id)
    assert.isNull(found.positionX)
    assert.isNull(found.positionY)
  })
})
