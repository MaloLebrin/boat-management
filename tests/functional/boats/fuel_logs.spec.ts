import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatFuelLog from '#models/boat_fuel_log'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import { UserFactory } from '#database/factories/user_factory'
import OrganizationMembership from '#models/organization_membership'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Fuel logs (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /boats/:boatId/fuel-logs creates a fuel log', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/fuel-logs`)
      .loginAs(user)
      .form({ fueledAt: '2026-06-01', quantityLiters: 120.5 })

    const log = await BoatFuelLog.query().where('boatId', boat.id).first()
    assert.isNotNull(log)
    assert.equal(Number.parseFloat(log!.quantityLiters), 120.5)
  })

  test('POST /boats/:boatId/fuel-logs with optional fields persists them', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post(`/boats/${boat.id}/fuel-logs`).loginAs(user).form({
      fueledAt: '2026-06-01',
      quantityLiters: 80,
      pricePerLiter: 2.15,
      totalCost: 172,
      supplier: 'Port de Nice',
      notes: 'Plein complet',
    })

    const log = await BoatFuelLog.query().where('boatId', boat.id).firstOrFail()
    assert.equal(Number.parseFloat(log.pricePerLiter!), 2.15)
    assert.equal(log.supplier, 'Port de Nice')
    assert.equal(log.notes, 'Plein complet')
  })

  test('POST /boats/:boatId/fuel-logs with engine from same boat persists engineId', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    await client.post(`/boats/${boat.id}/fuel-logs`).loginAs(user).form({
      fueledAt: '2026-06-01',
      quantityLiters: 50,
      boatEngineId: engine.id,
    })

    const log = await BoatFuelLog.query().where('boatId', boat.id).firstOrFail()
    assert.equal(log.boatEngineId, engine.id)
  })

  test('POST /boats/:boatId/fuel-logs with engine from another boat does not create log', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const foreignEngine = await BoatEngineFactory.merge({ boatId: otherBoat.id }).create()

    await client.post(`/boats/${boat.id}/fuel-logs`).loginAs(user).form({
      fueledAt: '2026-06-01',
      quantityLiters: 50,
      boatEngineId: foreignEngine.id,
    })

    const count = await BoatFuelLog.query().where('boatId', boat.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('POST /boats/:boatId/fuel-logs without quantityLiters does not create log', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post(`/boats/${boat.id}/fuel-logs`).loginAs(user).form({ fueledAt: '2026-06-01' })

    const count = await BoatFuelLog.query().where('boatId', boat.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('POST /boats/:boatId/fuel-logs requires authentication', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/fuel-logs`)
      .form({ fueledAt: '2026-06-01', quantityLiters: 100 })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')

    const count = await BoatFuelLog.query().where('boatId', boat.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('DELETE /boats/:boatId/fuel-logs/:logId deletes log as admin', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await BoatFuelLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    await client.delete(`/boats/${boat.id}/fuel-logs/${log.id}`).loginAs(user)

    const found = await BoatFuelLog.find(log.id)
    assert.isNull(found)
  })

  test('DELETE /boats/:boatId/fuel-logs/:logId is rejected for non-admin member', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const log = await BoatFuelLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
    }).create()

    const member = await UserFactory.merge({ organizationId: admin.organizationId! }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: admin.organizationId!,
      role: 'member',
    })

    await client.delete(`/boats/${boat.id}/fuel-logs/${log.id}`).loginAs(member).redirects(0)

    const found = await BoatFuelLog.find(log.id)
    assert.isNotNull(found)
  })
})
