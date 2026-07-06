import { BoatFactory } from '#database/factories/boat_factory'
import Client from '#models/client'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

/**
 * Régression issue #278 : la saisie de recherche est interpolée dans un motif
 * `ILIKE` ; sans échapper les métacaractères LIKE (`%`, `_`), `q = '%'`
 * renvoyait toutes les lignes de l'org et `q = 'A_B'` matchait aussi `AXB`.
 */

async function createEnterpriseAdminUser() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

test.group('Search LIKE escaping (issue #278)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

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
