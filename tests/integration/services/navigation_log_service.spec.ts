import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import NavigationLogService, {
  NavigationLogNotFoundError,
  NavigationLogInProgressError,
  NavigationLogConflictError,
  NavigationLogValidationError,
} from '#services/navigation_log_service'
import NavigationLog from '#models/navigation_log'
import BoatEngine from '#models/boat_engine'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'

test.group('NavigationLogService', () => {
  // ── createForBoat ─────────────────────────────────────────────────────────

  test('createForBoat crée un journal de navigation pour le bateau', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const svc = new NavigationLogService()

    const log = await svc.createForBoat(boat, {
      departedAt: DateTime.now().minus({ hours: 2 }).toISO(),
    })

    assert.isNumber(log.id)
    assert.equal(log.boatId, boat.id)
    assert.equal(log.organizationId, boat.organizationId)
    assert.equal(log.status, 'in_progress')
    assert.isNull(log.arrivedAt)
  })

  test('createForBoat stocke les champs optionnels', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const svc = new NavigationLogService()

    const log = await svc.createForBoat(boat, {
      departedAt: DateTime.now().minus({ hours: 3 }).toISO(),
      departurePortName: '  Port de Marseille  ',
      engineHoursStart: 100,
      windForceBeaufort: 4,
      seaState: 'moderate',
      crewCount: 3,
      notes: '  Beau temps  ',
    })

    assert.equal(log.departurePortName, 'Port de Marseille')
    assert.equal(log.engineHoursStart, '100')
    assert.equal(log.windForceBeaufort, 4)
    assert.equal(log.seaState, 'moderate')
    assert.equal(log.crewCount, 3)
    assert.equal(log.notes, 'Beau temps')
  })

  test('createForBoat throw NavigationLogInProgressError si un trajet est déjà en cours', async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const svc = new NavigationLogService()

    await assert.rejects(
      () =>
        svc.createForBoat(boat, {
          departedAt: DateTime.now().minus({ hours: 1 }).toISO(),
        }),
      NavigationLogInProgressError
    )
  })

  // ── closeTrip ─────────────────────────────────────────────────────────────

  test('closeTrip ferme un trajet en cours et le marque comme completed', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
      departedAt: DateTime.now().minus({ hours: 5 }),
    }).create()
    const svc = new NavigationLogService()

    const closed = await svc.closeTrip(boat, log.id, {
      arrivedAt: DateTime.now().minus({ hours: 1 }).toISO(),
      arrivalPortName: 'Port de Nice',
      distanceNm: 42.5,
    })

    assert.equal(closed.status, 'completed')
    assert.isNotNull(closed.arrivedAt)
    assert.equal(closed.arrivalPortName, 'Port de Nice')
    assert.equal(closed.distanceNm, '42.5')
  })

  test('closeTrip met à jour les heures moteur sur un bateau avec un seul moteur', async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 50 }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
      departedAt: DateTime.now().minus({ hours: 5 }),
    }).create()
    const svc = new NavigationLogService()

    await svc.closeTrip(boat, log.id, {
      arrivedAt: DateTime.now().minus({ hours: 1 }).toISO(),
      engineHoursEnd: 150,
    })

    const updatedEngine = await BoatEngine.findOrFail(engine.id)
    assert.equal(updatedEngine.hours, 150)
  })

  test('closeTrip throw NavigationLogConflictError quand expectedUpdatedAt ne correspond pas', async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
      departedAt: DateTime.now().minus({ hours: 5 }),
    }).create()
    const svc = new NavigationLogService()

    await assert.rejects(
      () =>
        svc.closeTrip(boat, log.id, {
          arrivedAt: DateTime.now().minus({ hours: 1 }).toISO(),
          expectedUpdatedAt: '2000-01-01T00:00:00.000Z', // valeur périmée
        }),
      NavigationLogConflictError
    )
  })

  test('closeTrip throw NavigationLogValidationError quand arrivedAt est avant departedAt', async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
      departedAt: DateTime.now().minus({ hours: 2 }),
    }).create()
    const svc = new NavigationLogService()

    await assert.rejects(
      () =>
        svc.closeTrip(boat, log.id, {
          arrivedAt: DateTime.now().minus({ hours: 10 }).toISO(), // avant departedAt
        }),
      NavigationLogValidationError
    )
  })

  test('closeTrip throw NavigationLogNotFoundError pour un trajet inexistant', async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const svc = new NavigationLogService()

    await assert.rejects(
      () =>
        svc.closeTrip(boat, 999999, {
          arrivedAt: DateTime.now().toISO(),
        }),
      NavigationLogNotFoundError
    )
  })

  // ── getForBoat ────────────────────────────────────────────────────────────

  test('getForBoat retourne le journal pour le bateau', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const svc = new NavigationLogService()

    const found = await svc.getForBoat(boat, log.id)

    assert.equal(found.id, log.id)
    assert.equal(found.boatId, boat.id)
  })

  test('getForBoat throw NavigationLogNotFoundError pour un id inexistant', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const svc = new NavigationLogService()

    await assert.rejects(() => svc.getForBoat(boat, 999999), NavigationLogNotFoundError)
  })

  test("getForBoat throw NavigationLogNotFoundError pour le journal d'un autre bateau", async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const otherBoat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: otherBoat.id,
      organizationId: otherBoat.organizationId,
    }).create()
    const svc = new NavigationLogService()

    await assert.rejects(() => svc.getForBoat(boat, log.id), NavigationLogNotFoundError)
  })

  // ── updateForBoat ─────────────────────────────────────────────────────────

  test('updateForBoat met à jour les champs du journal', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const svc = new NavigationLogService()

    const updated = await svc.updateForBoat(boat, log.id, {
      windForceBeaufort: 5,
      seaState: 'rough',
      crewCount: 2,
      notes: 'Conditions difficiles',
    })

    assert.equal(updated.windForceBeaufort, 5)
    assert.equal(updated.seaState, 'rough')
    assert.equal(updated.crewCount, 2)
    assert.equal(updated.notes, 'Conditions difficiles')

    const persisted = await NavigationLog.findOrFail(log.id)
    assert.equal(persisted.windForceBeaufort, 5)
  })

  test('updateForBoat throw NavigationLogNotFoundError pour un id inexistant', async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const svc = new NavigationLogService()

    await assert.rejects(
      () => svc.updateForBoat(boat, 999999, { crewCount: 1 }),
      NavigationLogNotFoundError
    )
  })

  // ── deleteForBoat ─────────────────────────────────────────────────────────

  test('deleteForBoat supprime le journal du bateau', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const svc = new NavigationLogService()

    await svc.deleteForBoat(boat, log.id)

    const found = await NavigationLog.find(log.id)
    assert.isNull(found)
  })

  test("deleteForBoat throw NavigationLogNotFoundError pour le journal d'un autre bateau", async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const otherBoat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: otherBoat.id,
      organizationId: otherBoat.organizationId,
    }).create()
    const svc = new NavigationLogService()

    await assert.rejects(() => svc.deleteForBoat(boat, log.id), NavigationLogNotFoundError)
  })
})
