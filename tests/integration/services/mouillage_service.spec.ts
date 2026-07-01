import { test } from '@japa/runner'
import MouillageService from '#services/mouillage_service'
import Mouillage from '#models/mouillage'
import Spot from '#models/spot'
import { MouillageHasBoatsError } from '#exceptions/port_errors'
import { UserFactory } from '#database/factories/user_factory'
import { PortFactory } from '#database/factories/port_factory'
import { MouillageFactory } from '#database/factories/mouillage_factory'
import { BoatFactory } from '#database/factories/boat_factory'

test.group('MouillageService.deleteForPort (integration)', () => {
  test('deleteForPort supprime le mouillage sans spots', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()

    const svc = new MouillageService()
    await svc.deleteForPort(mouillage)

    const found = await Mouillage.find(mouillage.id)
    assert.isNull(found)
  })

  test('deleteForPort supprime le mouillage dont les spots sont tous libres', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()
    await Spot.create({
      mouillageId: mouillage.id,
      pontoonId: null,
      name: 'M1',
      description: null,
      organizationId: user.organizationId!,
    })

    const svc = new MouillageService()
    await svc.deleteForPort(mouillage)

    const found = await Mouillage.find(mouillage.id)
    assert.isNull(found)
  })

  test('deleteForPort throw MouillageHasBoatsError quand un bateau occupe un spot', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()
    const spot = await Spot.create({
      mouillageId: mouillage.id,
      pontoonId: null,
      name: 'M2',
      description: null,
      organizationId: user.organizationId!,
    })
    await BoatFactory.merge({ organizationId: user.organizationId!, spotId: spot.id }).create()

    const svc = new MouillageService()
    await assert.rejects(() => svc.deleteForPort(mouillage), MouillageHasBoatsError)

    const found = await Mouillage.find(mouillage.id)
    assert.isNotNull(found)
  })
})
