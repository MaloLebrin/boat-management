import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Mouillage from '#models/mouillage'
import { BoatFactory } from '#database/factories/boat_factory'
import { PortFactory } from '#database/factories/port_factory'
import { MouillageFactory } from '#database/factories/mouillage_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createAdminUser } from '#tests/functional/helpers'

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
})
