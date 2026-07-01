import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Port from '#models/port'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Ports (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /ports returns 200 for authenticated user', async ({ client }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client.get('/ports').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /ports redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.get('/ports').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /ports creates a port and redirects to its page', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.post('/ports').loginAs(user).form({
      name: 'Port Vieux',
    })

    const port = await Port.findBy('name', 'Port Vieux')
    assert.isNotNull(port)
    assert.equal(port!.organizationId, user.organizationId)
    response.assertRedirectsTo(`/ports/${port!.id}`)
  })

  test('POST /ports does not create port when name is missing', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.post('/ports').loginAs(user).form({
      city: 'Marseille',
    })

    const redirectedToPort = response.redirects().some((url) => /\/ports\/\d+$/.test(url))
    assert.isFalse(redirectedToPort)
  })

  test('GET /ports/:id returns 200 for port in same org', async ({ client }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/ports/${port.id}`).loginAs(user)

    response.assertStatus(200)
  })

  test('GET /ports/:id redirects to /ports for port from another org', async ({ client }) => {
    const user = await UserFactory.with('organization').create()
    const otherPort = await PortFactory.with('organization').create()

    const response = await client.get(`/ports/${otherPort.id}`).loginAs(user)

    response.assertRedirectsTo('/ports')
  })

  test('PUT /ports/:id updates port and redirects to its page', async ({ client, assert }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.put(`/ports/${port.id}`).loginAs(user).form({
      name: 'Port Modifié',
    })

    response.assertRedirectsTo(`/ports/${port.id}`)

    await port.refresh()
    assert.equal(port.name, 'Port Modifié')
  })

  test('DELETE /ports/:id deletes port and redirects to /ports', async ({ client, assert }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.delete(`/ports/${port.id}`).loginAs(user)

    response.assertRedirectsTo('/ports')

    const found = await Port.find(port.id)
    assert.isNull(found)
  })

  test('DELETE /ports/:id from another org does not delete the port', async ({
    client,
    assert,
  }) => {
    const otherUser = await UserFactory.with('organization').create()
    const owner = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: owner.organizationId! }).create()

    await client.delete(`/ports/${port.id}`).loginAs(otherUser)

    const found = await Port.find(port.id)
    assert.isNotNull(found)
  })

  test('DELETE /ports/:id redirects back with flash error when port has boats', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
    const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
    const spot = await SpotFactory.merge({
      pontoonId: pontoon.id,
      organizationId: user.organizationId!,
    }).create()
    await BoatFactory.merge({ organizationId: user.organizationId!, spotId: spot.id }).create()

    const response = await client.delete(`/ports/${port.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/ports/${port.id}`)
    const found = await Port.find(port.id)
    assert.isNotNull(found)
  })
})
