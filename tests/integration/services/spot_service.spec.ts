import { test } from '@japa/runner'
import SpotService from '#services/spot_service'
import Spot from '#models/spot'
import { SpotNotFoundError } from '#exceptions/port_errors'
import { UserFactory } from '#database/factories/user_factory'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { MouillageFactory } from '#database/factories/mouillage_factory'

test.group('SpotService', () => {
  // ── getForUserOrFail ─────────────────────────────────────────────────────

  test("getForUserOrFail retourne le spot de l'organisation de l'utilisateur", async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await Spot.create({
      organizationId: user.organizationId!,
      pontoonId: pontoon.id,
      mouillageId: null,
      name: 'A1',
      description: null,
    })
    const svc = new SpotService()

    const found = await svc.getForUserOrFail(user, spot.id)

    assert.equal(found.id, spot.id)
    assert.equal(found.name, spot.name)
  })

  test("getForUserOrFail throw SpotNotFoundError pour un spot d'une autre organisation", async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const otherPort = await PortFactory.with('organization').create()
    const otherPontoon = await PontoonFactory.merge({ portId: otherPort.id }).create()
    const otherSpot = await Spot.create({
      organizationId: otherPort.organizationId,
      pontoonId: otherPontoon.id,
      mouillageId: null,
      name: 'B1',
      description: null,
    })
    const svc = new SpotService()

    await assert.rejects(() => svc.getForUserOrFail(user, otherSpot.id), SpotNotFoundError)
  })

  test('getForUserOrFail throw SpotNotFoundError pour un id inexistant', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new SpotService()

    await assert.rejects(() => svc.getForUserOrFail(user, 999999), SpotNotFoundError)
  })

  test("getForUserOrFail throw SpotNotFoundError si l'utilisateur n'a pas d'organisation", async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    user.organizationId = null as unknown as number
    const svc = new SpotService()

    await assert.rejects(() => svc.getForUserOrFail(user, 1), SpotNotFoundError)
  })

  // ── createForPontoon ─────────────────────────────────────────────────────

  test('createForPontoon crée un spot rattaché au pontoon avec organizationId du port', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const svc = new SpotService()

    const spot = await svc.createForPontoon(pontoon, port, { name: 'A1' })

    assert.isNumber(spot.id)
    assert.equal(spot.pontoonId, pontoon.id)
    assert.isNull(spot.mouillageId)
    assert.equal(spot.organizationId, port.organizationId)
    assert.equal(spot.name, 'A1')
    assert.isNull(spot.description)
  })

  test('createForPontoon stocke la description quand elle est fournie', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const svc = new SpotService()

    const spot = await svc.createForPontoon(pontoon, port, {
      name: 'B2',
      description: 'Emplacement grand format',
    })

    assert.equal(spot.description, 'Emplacement grand format')
  })

  // ── createForMouillage ────────────────────────────────────────────────────

  test('createForMouillage crée un spot rattaché au mouillage avec organizationId du port', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()
    const svc = new SpotService()

    const spot = await svc.createForMouillage(mouillage, port, { name: 'M1' })

    assert.isNumber(spot.id)
    assert.equal(spot.mouillageId, mouillage.id)
    assert.isNull(spot.pontoonId)
    assert.equal(spot.organizationId, port.organizationId)
    assert.equal(spot.name, 'M1')
    assert.isNull(spot.description)
  })

  test('createForMouillage met description à null quand omise', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const mouillage = await MouillageFactory.merge({ portId: port.id }).create()
    const svc = new SpotService()

    const spot = await svc.createForMouillage(mouillage, port, { name: 'M2' })

    assert.isNull(spot.description)
  })

  // ── update ───────────────────────────────────────────────────────────────

  test('update met à jour le nom et la description du spot', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await Spot.create({
      organizationId: user.organizationId!,
      pontoonId: pontoon.id,
      mouillageId: null,
      name: 'A1',
      description: null,
    })
    const svc = new SpotService()

    const updated = await svc.update(spot, { name: 'Nouveau Nom', description: 'Ma desc' })

    assert.equal(updated.name, 'Nouveau Nom')
    assert.equal(updated.description, 'Ma desc')

    const persisted = await Spot.findOrFail(spot.id)
    assert.equal(persisted.name, 'Nouveau Nom')
    assert.equal(persisted.description, 'Ma desc')
  })

  test('update met description à null quand description est omise', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await Spot.create({
      organizationId: user.organizationId!,
      pontoonId: pontoon.id,
      mouillageId: null,
      name: 'A1',
      description: null,
    })
    const svc = new SpotService()

    const updated = await svc.update(spot, { name: 'Sans Description' })

    assert.isNull(updated.description)
  })

  // ── delete ────────────────────────────────────────────────────────────────

  test('delete supprime le spot', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await Spot.create({
      organizationId: user.organizationId!,
      pontoonId: pontoon.id,
      mouillageId: null,
      name: 'A1',
      description: null,
    })
    const svc = new SpotService()

    await svc.delete(spot)

    const found = await Spot.find(spot.id)
    assert.isNull(found)
  })
})
