import { BoatFactory } from '#database/factories/boat_factory'
import Client from '#models/client'
import { createAdminUser, createEnterpriseAdminUser } from '#tests/functional/helpers'
import { truncateDb } from '#tests/utils/db'
import { test } from '@japa/runner'

test.group('Search LIKE escaping (issue #278)', (group) => {
  group.each.setup(() => truncateDb())

  test('clients: q="%" only returns rows containing a literal %', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Promo%Deal',
      lastName: 'LiteralPercent',
      status: 'active',
    })
    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Unrelated',
      status: 'active',
    })

    const response = await client.get(`/clients?q=${encodeURIComponent('%')}`).loginAs(user)

    response.assertStatus(200)
    const html = response.text()
    assert.include(html, 'LiteralPercent')
    assert.notInclude(html, 'Unrelated')
  })

  test('clients: q="A_B" treats _ literally (does not match AXB)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'A_B',
      lastName: 'LiteralUnderscore',
      status: 'active',
    })
    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'AXB',
      lastName: 'WildcardMatch',
      status: 'active',
    })

    const response = await client.get(`/clients?q=${encodeURIComponent('A_B')}`).loginAs(user)

    response.assertStatus(200)
    const html = response.text()
    assert.include(html, 'LiteralUnderscore')
    assert.notInclude(html, 'WildcardMatch')
  })

  test('boats: q="%" only returns boats whose name contains a literal %', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Sale 50% Off',
    }).create()
    await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Ordinary Vessel',
    }).create()

    const response = await client.get(`/boats?q=${encodeURIComponent('%')}`).loginAs(user)

    response.assertStatus(200)
    const html = response.text()
    assert.include(html, 'Sale 50% Off')
    assert.notInclude(html, 'Ordinary Vessel')
  })
})
