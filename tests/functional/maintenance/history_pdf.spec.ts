import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Maintenance history PDF (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /maintenance/history.pdf returns PDF for Pro user', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'boat',
      performedAt: '2024-05-01',
      title: 'Antifouling',
    })

    const response = await client.get('/maintenance/history.pdf').loginAs(user).redirects(0)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')
    assert.include(response.header('content-disposition'), 'attachment')
  })

  test('GET /maintenance/history.pdf applies the current filters', async ({ client, assert }) => {
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
      .get('/maintenance/history.pdf')
      .qs({ subject: 'engine' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')
  })

  test('GET /maintenance/history.pdf renders notes and parts without error', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    await svc.createForBoat(user, boat, {
      subject: 'engine',
      engineCaption: 'Yanmar',
      performedAt: '2024-03-01',
      title: 'Vidange',
      notes: 'Huile changée, filtre remplacé.',
      parts: [{ name: 'Filtre à huile', quantity: '1' }],
    })

    const response = await client.get('/maintenance/history.pdf').loginAs(user).redirects(0)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')
  })

  test('GET /maintenance/history.pdf paginates across multiple PDF pages', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new BoatMaintenanceService()
    for (let i = 0; i < 40; i++) {
      const day = String((i % 28) + 1).padStart(2, '0')
      await svc.createForBoat(user, boat, {
        subject: 'boat',
        performedAt: `2024-01-${day}`,
        title: `Intervention ${i}`,
      })
    }

    const response = await client.get('/maintenance/history.pdf').loginAs(user).redirects(0)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')
  })

  test('GET /maintenance/history.pdf works with zero events', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.get('/maintenance/history.pdf').loginAs(user).redirects(0)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')
  })

  test('GET /maintenance/history.pdf redirects with error for Starter user', async ({ client }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()

    const response = await client.get('/maintenance/history.pdf').loginAs(user).redirects(0)

    response.assertStatus(302)
  })

  test('GET /maintenance/history.pdf redirects unauthenticated user to login', async ({
    client,
  }) => {
    const response = await client.get('/maintenance/history.pdf').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
