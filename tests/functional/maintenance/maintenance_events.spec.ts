import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Maintenance events (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /boats/:id/maintenance creates an event', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post(`/boats/${boat.id}/maintenance`).loginAs(user).form({
      subject: 'boat',
      title: 'Antifouling',
      performedAt: '2025-05-01',
    })

    const event = await BoatMaintenanceEvent.query()
      .where('boatId', boat.id)
      .where('title', 'Antifouling')
      .first()
    assert.isNotNull(event)
    assert.equal(event!.subject, 'boat')
  })

  test('POST /boats/:id/maintenance does not create event when title is missing', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post(`/boats/${boat.id}/maintenance`).loginAs(user).form({
      subject: 'boat',
      performedAt: '2025-05-01',
    })

    const count = await BoatMaintenanceEvent.query().where('boatId', boat.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('DELETE /boats/:id/maintenance/:eventId deletes the event', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.post(`/boats/${boat.id}/maintenance`).loginAs(user).form({
      subject: 'boat',
      title: 'Antifouling to delete',
      performedAt: '2025-05-01',
    })

    const event = await BoatMaintenanceEvent.query().where('boatId', boat.id).firstOrFail()

    await client.delete(`/boats/${boat.id}/maintenance/${event.id}`).loginAs(user)

    const found = await BoatMaintenanceEvent.find(event.id)
    assert.isNull(found)
  })

  test('POST /boats/:id/maintenance requires authentication', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/maintenance`)
      .form({
        subject: 'boat',
        title: 'Unauthorized',
        performedAt: '2025-05-01',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')

    const count = await BoatMaintenanceEvent.query().where('boatId', boat.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })
})
