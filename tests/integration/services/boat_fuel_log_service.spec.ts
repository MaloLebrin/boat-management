import { test } from '@japa/runner'
import BoatFuelLog from '#models/boat_fuel_log'
import BoatFuelLogService from '#services/boat_fuel_log_service'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import { UserFactory } from '#database/factories/user_factory'

/**
 * `BoatFuelLogService` était le seul service de sous-ressource bateau à ne pas
 * vérifier que le bateau appartient à l'organisation de l'utilisateur : la
 * politique Bouncer le faisait au niveau du contrôleur, mais un appel direct
 * (job, assistant, import) passait sans garde-fou.
 */
const PAYLOAD = { fueledAt: '2026-06-01', quantityLiters: 40 }

async function userAndForeignBoat() {
  const user = await UserFactory.with('organization').create()
  const foreignBoat = await BoatFactory.with('organization').create()
  return { user, foreignBoat }
}

test.group('BoatFuelLogService — portée d’organisation', () => {
  test("listForBoat rejette le bateau d'une autre organisation", async ({ assert }) => {
    const { user, foreignBoat } = await userAndForeignBoat()
    const service = new BoatFuelLogService()

    await assert.rejects(() => service.listForBoat(user, foreignBoat), BoatNotFoundError)
  })

  test("createForBoat rejette le bateau d'une autre organisation sans rien écrire", async ({
    assert,
  }) => {
    const { user, foreignBoat } = await userAndForeignBoat()
    const service = new BoatFuelLogService()

    await assert.rejects(() => service.createForBoat(user, foreignBoat, PAYLOAD), BoatNotFoundError)
    assert.lengthOf(await BoatFuelLog.query().where('boatId', foreignBoat.id), 0)
  })

  test("deleteForBoat rejette le bateau d'une autre organisation et conserve le plein", async ({
    assert,
  }) => {
    const { user, foreignBoat } = await userAndForeignBoat()
    const log = await BoatFuelLogFactory.merge({
      boatId: foreignBoat.id,
      organizationId: foreignBoat.organizationId,
    }).create()
    const service = new BoatFuelLogService()

    await assert.rejects(() => service.deleteForBoat(user, foreignBoat, log.id), BoatNotFoundError)
    assert.isNotNull(await log.refresh())
  })

  test('le bateau de sa propre organisation reste accessible', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const service = new BoatFuelLogService()

    const created = await service.createForBoat(user, boat, PAYLOAD)
    const listed = await service.listForBoat(user, boat)

    assert.lengthOf(listed, 1)
    assert.equal(listed[0].id, created.id)
    await service.deleteForBoat(user, boat, created.id)
    assert.lengthOf(await service.listForBoat(user, boat), 0)
  })
})
