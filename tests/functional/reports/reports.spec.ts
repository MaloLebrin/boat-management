import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import AssistantToolsService from '#services/assistant_tools_service'
import type { ReportsPageProps } from '#shared/types/reporting'
import {
  createAdminUser,
  createBoatOwnerUser,
  createCharterAdminUser,
  createMechanicUser,
  createMemberUser,
  createStarterAdminUser,
} from '#tests/functional/helpers'

/** Un plein de 120 € ce mois-ci, sur un bateau de l'organisation. */
async function seedFuel(organizationId: number, name = 'Albatros', cost = '120.00') {
  const boat = await BoatFactory.merge({ organizationId, name }).create()
  await BoatFuelLogFactory.merge({
    boatId: boat.id,
    organizationId,
    fueledAt: DateTime.now().startOf('month').plus({ hours: 10 }),
    totalCost: cost,
  }).create()
  return boat
}

test.group('Reporting de flotte — page /reports (#887)', (group) => {
  group.each.setup(() => truncateDb())

  test('a Pro admin gets the report of the current month', async ({ client, assert }) => {
    const admin = await createAdminUser('pro')
    const boat = await seedFuel(admin.organizationId!)

    const response = await client.get('/reports').loginAs(admin).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('reports/index')
    const props = response.inertiaProps as unknown as ReportsPageProps
    assert.isFalse(props.locked)
    assert.equal(props.report!.period.preset, 'month')
    assert.equal(props.report!.totals.costs.fuel, 120)
    assert.deepEqual(props.boats, [{ id: boat.id, name: 'Albatros' }])
    // Pro sans module : ni revenus de location ni encaissé, mais l'export.
    assert.isFalse(props.charterEnabled)
    assert.isFalse(props.invoicingEnabled)
    assert.isTrue(props.canExport)
  })

  test('never reads another organization', async ({ client, assert }) => {
    const admin = await createAdminUser('pro')
    await seedFuel(admin.organizationId!)
    const intruder = await createAdminUser('pro')
    const foreignBoat = await seedFuel(intruder.organizationId!, 'Pirate', '999.00')

    const response = await client
      .get('/reports')
      .qs({ boat: foreignBoat.id })
      .loginAs(admin)
      .withInertia()

    const props = response.inertiaProps as unknown as ReportsPageProps
    // Le bateau d'une autre organisation ne filtre rien : retour à sa propre flotte.
    assert.isNull(props.report!.boatId)
    assert.equal(props.report!.totals.costs.total, 120)
    assert.notInclude(
      props.boats.map((b) => b.id),
      foreignBoat.id
    )
  })

  test('applies the period and boat filters from the query string', async ({ client, assert }) => {
    const admin = await createAdminUser('pro')
    const boat = await seedFuel(admin.organizationId!)
    await seedFuel(admin.organizationId!, 'Bécassine', '30.00')

    const response = await client
      .get('/reports')
      .qs({ period: 'custom', from: '2026-01-01', to: '2026-03-31', boat: boat.id })
      .loginAs(admin)
      .withInertia()

    const props = response.inertiaProps as unknown as ReportsPageProps
    assert.deepInclude(props.report!.period, {
      preset: 'custom',
      from: '2026-01-01',
      to: '2026-03-31',
    })
    assert.equal(props.report!.boatId, boat.id)
    assert.lengthOf(props.report!.boats, 1)
    assert.deepEqual(props.query, {
      preset: 'custom',
      from: '2026-01-01',
      to: '2026-03-31',
      boatId: boat.id,
    })
  })

  test('the charter module brings rental revenue and occupancy', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const start = DateTime.now().startOf('month').plus({ days: 1 })
    await BoatReservationFactory.merge({
      organizationId: admin.organizationId!,
      boatId: boat.id,
      status: 'confirmed',
      startsAt: start,
      endsAt: start.plus({ days: 2 }),
      totalPrice: '600.00',
    }).create()

    const response = await client.get('/reports').loginAs(admin).withInertia()

    const props = response.inertiaProps as unknown as ReportsPageProps
    assert.isTrue(props.charterEnabled)
    assert.equal(props.report!.totals.rentalRevenue, 600)
    assert.equal(props.report!.totals.rentalDays, 2)
    assert.equal(props.report!.totals.margin, 600)
  })

  test('a Starter admin sees a locked preview without any figure', async ({ client, assert }) => {
    const admin = await createStarterAdminUser()
    await seedFuel(admin.organizationId!)

    const response = await client.get('/reports').loginAs(admin).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as unknown as ReportsPageProps
    assert.isTrue(props.locked)
    assert.isNull(props.report)
    assert.isFalse(props.canExport)
  })

  test('a member and a mechanic are refused', async ({ client }) => {
    const admin = await createAdminUser('pro')
    const member = await createMemberUser(admin.organizationId!)
    const mechanic = await createMechanicUser(admin.organizationId!)

    const memberResponse = await client.get('/reports').loginAs(member).redirects(0)
    memberResponse.assertStatus(403)
    const mechanicResponse = await client.get('/reports').loginAs(mechanic).redirects(0)
    mechanicResponse.assertStatus(403)
  })

  test('a boat owner is sent back to the owner portal', async ({ client, assert }) => {
    const admin = await createAdminUser('pro')
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client.get('/reports').loginAs(owner).redirects(0)

    response.assertStatus(302)
    assert.include(response.header('location'), '/owner')
  })

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/reports').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('Reporting de flotte — export CSV (#887)', (group) => {
  group.each.setup(() => truncateDb())

  test('exports one row per boat and the fleet total', async ({ client, assert }) => {
    const admin = await createAdminUser('pro')
    await seedFuel(admin.organizationId!)

    const response = await client
      .get('/reports/export.csv')
      .qs({ period: 'month' })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/csv; charset=utf-8')
    assert.include(response.header('content-disposition'), 'rapport_flotte_')
    const lines = response
      .text()
      .replace(/^\uFEFF/, '')
      .split('\r\n')
    assert.lengthOf(lines, 3)
    assert.isTrue(lines[0]!.startsWith('boat;maintenance;fuel;'))
    assert.isTrue(lines[1]!.startsWith('Albatros;0;120;'))
    assert.isTrue(lines[2]!.startsWith('FLEET TOTAL;0;120;'))
  })

  test('is refused on the Starter plan and to a member', async ({ client }) => {
    const starter = await createStarterAdminUser()
    const starterResponse = await client.get('/reports/export.csv').loginAs(starter).redirects(0)
    // `QuotaExceededError` : redirection vers l'upsell, jamais un CSV.
    starterResponse.assertStatus(302)
    starterResponse.assertFlashMessage('errorAction', '/settings/billing')

    const admin = await createAdminUser('pro')
    const member = await createMemberUser(admin.organizationId!)
    const memberResponse = await client.get('/reports/export.csv').loginAs(member).redirects(0)
    memberResponse.assertStatus(403)
  })
})

test.group('Reporting de flotte — outil du copilote (#887)', (group) => {
  group.each.setup(() => truncateDb())

  test('the assistant tool answers from the same service, admin and Pro only', async ({
    assert,
  }) => {
    const admin = await createAdminUser('pro')
    await seedFuel(admin.organizationId!)
    const member = await createMemberUser(admin.organizationId!)
    const starter = await createStarterAdminUser()
    const service = await app.container.make(AssistantToolsService)

    const result = JSON.parse(
      await service.run(admin, {
        id: 'c1',
        name: 'fleet_financial_report',
        arguments: { period: 'month' },
      })
    ) as { totals: { costs: { total: number } }; boats: { boatName: string; costs: number }[] }
    assert.equal(result.totals.costs.total, 120)
    assert.deepEqual(
      result.boats.map((b) => [b.boatName, b.costs]),
      [['Albatros', 120]]
    )

    const memberTools = await service.definitionsFor(member)
    assert.notInclude(
      memberTools.map((d) => d.name),
      'fleet_financial_report'
    )
    const starterTools = await service.definitionsFor(starter)
    assert.notInclude(
      starterTools.map((d) => d.name),
      'fleet_financial_report'
    )
  })
})
