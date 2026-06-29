import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatPortStayFactory } from '#database/factories/boat_port_stay_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatPortStay from '#models/boat_port_stay'

test.group('Budget Port Stay (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /boats/:id/port-stays creates a port stay for authorized user', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/port-stays`)
      .form({
        portName: 'Port de Marseille',
        startedAt: '2024-06-01',
        endedAt: '2024-06-15',
        cost: '250.50',
        notes: 'Summer stay',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const stays = await BoatPortStay.query().where('boat_id', boat.id)
    assert.lengthOf(stays, 1)
    assert.equal(stays[0].portName, 'Port de Marseille')
    assert.equal(stays[0].cost, '250.50')
  })

  test('POST /boats/:id/port-stays redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/port-stays`)
      .form({
        portName: 'Port de Nice',
        startedAt: '2024-07-01',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /boats/:id/port-stays redirects to /boats when boat not found', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/boats/999999/port-stays')
      .form({
        portName: 'Port de Nice',
        startedAt: '2024-07-01',
      })
      .loginAs(user)

    response.assertRedirectsTo('/boats')
  })

  test('POST /boats/:id/port-stays redirects when boat belongs to another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/port-stays`)
      .form({
        portName: 'Port de Nice',
        startedAt: '2024-07-01',
      })
      .loginAs(other)

    response.assertRedirectsTo('/boats')

    const stays = await BoatPortStay.query().where('boat_id', boat.id)
    assert.lengthOf(stays, 0)
  })

  test('POST /boats/:id/port-stays validates required fields', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/port-stays`)
      .form({
        portName: '',
        startedAt: '',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const stays = await BoatPortStay.query().where('boat_id', boat.id)
    assert.lengthOf(stays, 0)
  })

  test('DELETE /boats/:id/port-stays/:stayId deletes the port stay', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const stay = await BoatPortStay.create({
      boatId: boat.id,
      portName: 'Port de Toulon',
      startedAt: DateTime.fromISO('2024-08-01'),
      cost: '100',
    })

    const response = await client
      .delete(`/boats/${boat.id}/port-stays/${stay.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const deleted = await BoatPortStay.find(stay.id)
    assert.isNull(deleted)
  })

  test('DELETE /boats/:id/port-stays/:stayId redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const stay = await BoatPortStay.create({
      boatId: boat.id,
      portName: 'Port de Toulon',
      startedAt: DateTime.fromISO('2024-08-01'),
    })

    const response = await client.delete(`/boats/${boat.id}/port-stays/${stay.id}`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('DELETE /boats/:id/port-stays/:stayId redirects when boat belongs to another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const stay = await BoatPortStay.create({
      boatId: boat.id,
      portName: 'Port de Toulon',
      startedAt: DateTime.fromISO('2024-08-01'),
    })

    const response = await client.delete(`/boats/${boat.id}/port-stays/${stay.id}`).loginAs(other)

    response.assertRedirectsTo('/boats')

    const existing = await BoatPortStay.find(stay.id)
    assert.isNotNull(existing)
  })

  test('PATCH /boats/:id/port-stays/:stayId updates the port stay', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const stay = await BoatPortStayFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .patch(`/boats/${boat.id}/port-stays/${stay.id}`)
      .form({
        portName: 'Port de Monaco',
        startedAt: '2024-09-01',
        cost: '750.00',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const updated = await BoatPortStay.findOrFail(stay.id)
    assert.equal(updated.portName, 'Port de Monaco')
    assert.equal(updated.cost, '750.00')
  })

  test('PATCH /boats/:id/port-stays/:stayId redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const stay = await BoatPortStayFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .patch(`/boats/${boat.id}/port-stays/${stay.id}`)
      .form({ portName: 'X', startedAt: '2024-01-01' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('PATCH /boats/:id/port-stays/:stayId redirects when boat belongs to another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const stay = await BoatPortStayFactory.merge({ boatId: boat.id }).create()
    const originalPortName = stay.portName

    const response = await client
      .patch(`/boats/${boat.id}/port-stays/${stay.id}`)
      .form({ portName: 'Hacked', startedAt: '2024-01-01' })
      .loginAs(other)

    response.assertRedirectsTo('/boats')

    const unchanged = await BoatPortStay.findOrFail(stay.id)
    assert.equal(unchanged.portName, originalPortName)
  })
})
