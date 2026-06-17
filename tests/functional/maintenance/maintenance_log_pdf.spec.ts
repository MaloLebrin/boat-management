import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Maintenance log PDF (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /boats/:id/maintenance-log.pdf returns PDF for Pro user', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatMaintenanceEventFactory.merge({ boatId: boat.id }).createMany(3)

    const response = await client
      .get(`/boats/${boat.id}/maintenance-log.pdf`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')
    assert.include(response.header('content-disposition'), 'attachment')
  })

  test('GET /boats/:id/maintenance-log.pdf redirects with error for Starter user', async ({
    client,
  }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}/maintenance-log.pdf`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
  })

  test('GET /boats/:id/maintenance-log.pdf redirects unauthenticated user to login', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/maintenance-log.pdf`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /boats/:id/maintenance-log.pdf returns 302 for boat from another org', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const otherUser = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}/maintenance-log.pdf`)
      .loginAs(otherUser)
      .redirects(0)

    response.assertStatus(302)
  })

  test('GET /boats/:id/maintenance-log.pdf works with zero events', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}/maintenance-log.pdf`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')
  })
})
