import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Pontoon from '#models/pontoon'
import { BoatFactory } from '#database/factories/boat_factory'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Pontoons (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('DELETE /ports/:portId/pontoons/:pontoonId deletes pontoon and redirects', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()

    const response = await client.delete(`/ports/${port.id}/pontoons/${pontoon.id}`).loginAs(user)

    response.assertRedirectsTo(`/ports/${port.id}`)
    const found = await Pontoon.find(pontoon.id)
    assert.isNull(found)
  })

  test('DELETE /ports/:portId/pontoons/:pontoonId redirects back with flash error when pontoon has boats', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await SpotFactory.merge({
      pontoonId: pontoon.id,
      organizationId: user.organizationId!,
    }).create()
    await BoatFactory.merge({ organizationId: user.organizationId!, spotId: spot.id }).create()

    const response = await client
      .delete(`/ports/${port.id}/pontoons/${pontoon.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/ports/${port.id}`)
    const found = await Pontoon.find(pontoon.id)
    assert.isNotNull(found)
  })
})
