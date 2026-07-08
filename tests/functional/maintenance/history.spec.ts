import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import type {
  MaintenanceBoatOption,
  MaintenanceEventRow,
  MaintenanceHistoryFilters,
  MaintenanceHistoryStats,
} from '#shared/types/maintenance'

type HistoryProps = {
  events: { data: MaintenanceEventRow[]; meta: { total: number; lastPage: number } }
  stats: MaintenanceHistoryStats
  filters: MaintenanceHistoryFilters
  boatOptions: MaintenanceBoatOption[]
}

test.group('Maintenance history (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /maintenance/history renders the page with events, filters and boat options', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-05-01',
      title: 'Antifouling',
    })

    const response = await client.get('/maintenance/history').loginAs(user).withInertia()

    response.assertInertiaComponent('maintenance/history')
    const props = response.inertiaProps as HistoryProps
    assert.lengthOf(props.events.data, 1)
    assert.equal(props.events.data[0]!.title, 'Antifouling')
    assert.equal(props.stats.totalEvents, 1)
    assert.equal(props.filters.subject, '')
    assert.equal(props.filters.page, 1)
    assert.isAtLeast(props.boatOptions.length, 1)
  })

  test('GET /maintenance/history applies the subject filter from query params', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-01-01',
      title: 'Hull',
    })
    await svc.createForBoat(user, boat, {
      subject: 'engine',
      engineCaption: 'Yanmar',
      performedAt: '2024-02-01',
      title: 'Oil change',
    })

    const response = await client
      .get('/maintenance/history')
      .qs({ subject: 'engine' })
      .loginAs(user)
      .withInertia()

    const props = response.inertiaProps as HistoryProps
    assert.lengthOf(props.events.data, 1)
    assert.equal(props.events.data[0]!.subject, 'engine')
    assert.equal(props.filters.subject, 'engine')
    assert.equal(props.stats.totalEvents, 1)
  })

  test('GET /maintenance/history requires authentication', async ({ client }) => {
    const response = await client.get('/maintenance/history').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
