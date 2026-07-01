import { test } from '@japa/runner'
import PontoonService from '#services/pontoon_service'
import Pontoon from '#models/pontoon'
import Spot from '#models/spot'
import { PontoonHasBoatsError } from '#exceptions/port_errors'
import { UserFactory } from '#database/factories/user_factory'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { BoatFactory } from '#database/factories/boat_factory'

test.group('PontoonService.deleteForPort (integration)', () => {
  test('deleteForPort supprime le pontoon sans spots', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()

    const svc = new PontoonService()
    await svc.deleteForPort(pontoon)

    const found = await Pontoon.find(pontoon.id)
    assert.isNull(found)
  })

  test('deleteForPort supprime le pontoon dont les spots sont tous libres', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    await Spot.create({
      pontoonId: pontoon.id,
      mouillageId: null,
      name: 'A1',
      description: null,
      organizationId: user.organizationId!,
    })

    const svc = new PontoonService()
    await svc.deleteForPort(pontoon)

    const found = await Pontoon.find(pontoon.id)
    assert.isNull(found)
  })

  test('deleteForPort throw PontoonHasBoatsError quand un bateau occupe un spot', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await Spot.create({
      pontoonId: pontoon.id,
      mouillageId: null,
      name: 'B1',
      description: null,
      organizationId: user.organizationId!,
    })
    await BoatFactory.merge({ organizationId: user.organizationId!, spotId: spot.id }).create()

    const svc = new PontoonService()
    await assert.rejects(() => svc.deleteForPort(pontoon), PontoonHasBoatsError)

    const found = await Pontoon.find(pontoon.id)
    assert.isNotNull(found)
  })
})
