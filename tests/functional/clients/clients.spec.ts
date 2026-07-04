import { UserFactory } from '#database/factories/user_factory'
import Client from '#models/client'
import OrganizationMembership from '#models/organization_membership'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

/**
 * Creates an admin user with an Enterprise plan (required for clients feature).
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

test.group('Clients (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('index lists only current-org clients (org-scoping)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    // Create client in user's org
    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Alice',
      lastName: 'Martin',
      status: 'active',
    })

    // Create client in another org
    const otherUser = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'enterprise' })
    ).create()
    await Client.create({
      organizationId: otherUser.organizationId!,
      firstName: 'Bob',
      lastName: 'Evil',
      status: 'active',
    })

    const response = await client.get('/clients').loginAs(user)

    response.assertStatus(200)

    const html = response.text()
    assert.include(html, 'Alice')
    assert.include(html, 'Martin')
    assert.notInclude(html, 'Bob')
    assert.notInclude(html, 'Evil')
  })

  test('search by name returns matches', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Jean',
      lastName: 'Dupont',
      status: 'active',
    })

    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Marie',
      lastName: 'Curie',
      status: 'active',
    })

    const response = await client.get('/clients?q=Dupont').loginAs(user)

    response.assertStatus(200)

    const html = response.text()
    assert.include(html, 'Jean')
    assert.include(html, 'Dupont')
    assert.notInclude(html, 'Marie')
    assert.notInclude(html, 'Curie')
  })

  test('search by email returns matches', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      status: 'active',
    })

    await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Marie',
      lastName: 'Curie',
      email: 'marie@example.com',
      status: 'active',
    })

    const response = await client.get('/clients?q=jean@example').loginAs(user)

    response.assertStatus(200)

    const html = response.text()
    assert.include(html, 'Jean')
    assert.include(html, 'Dupont')
    assert.notInclude(html, 'Marie')
  })

  test('store creates a client', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client.post('/clients').loginAs(user).form({
      firstName: 'Nouveau',
      lastName: 'Client',
      email: 'nouveau@example.com',
      phone: '+33 1 23 45 67 89',
      status: 'active',
    })

    response.assertRedirectsTo('/clients')

    const createdClient = await Client.query()
      .where('organizationId', user.organizationId!)
      .where('firstName', 'Nouveau')
      .firstOrFail()

    assert.equal(createdClient.lastName, 'Client')
    assert.equal(createdClient.email, 'nouveau@example.com')
    assert.equal(createdClient.phone, '+33 1 23 45 67 89')
    assert.equal(createdClient.status, 'active')
  })

  test('update modifies a client', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const existingClient = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Original',
      lastName: 'Name',
      status: 'active',
    })

    const response = await client.put(`/clients/${existingClient.id}`).loginAs(user).form({
      firstName: 'Updated',
      lastName: 'Person',
      status: 'inactive',
    })

    response.assertRedirectsTo('/clients')

    await existingClient.refresh()
    assert.equal(existingClient.firstName, 'Updated')
    assert.equal(existingClient.lastName, 'Person')
    assert.equal(existingClient.status, 'inactive')
  })

  test('destroy deletes a client', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const existingClient = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'ToDelete',
      lastName: 'Client',
      status: 'active',
    })

    const response = await client.delete(`/clients/${existingClient.id}`).loginAs(user)

    response.assertRedirectsTo('/clients')

    const deleted = await Client.find(existingClient.id)
    assert.isNull(deleted)
  })

  test('non-enterprise org is redirected from index with flash', async ({ client }) => {
    // createAdminUser creates a 'pro' plan by default
    const user = await createAdminUser()

    const response = await client.get('/clients').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
    response.assertFlashMessage('error', 'This feature requires the Enterprise plan.')
  })

  test('non-enterprise org is blocked from store with flash', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/clients')
      .loginAs(user)
      .form({
        firstName: 'Test',
        lastName: 'Client',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')

    // Ensure no client was created
    const count = await Client.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('starter plan org is blocked from clients', async ({ client }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    if (user.organizationId) {
      await OrganizationMembership.create({
        userId: user.id,
        organizationId: user.organizationId,
        role: 'admin',
      })
    }

    const response = await client.get('/clients').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
    response.assertFlashMessage('error', 'This feature requires the Enterprise plan.')
  })

  test('enterprise org succeeds on index', async ({ client }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client.get('/clients').loginAs(user)

    response.assertStatus(200)
  })

  test('enterprise org succeeds on store', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client.post('/clients').loginAs(user).form({
      firstName: 'Enterprise',
      lastName: 'Client',
    })

    response.assertRedirectsTo('/clients')

    const createdClient = await Client.query()
      .where('organizationId', user.organizationId!)
      .where('firstName', 'Enterprise')
      .first()

    assert.isNotNull(createdClient)
  })

  test('unauthenticated user is redirected to login', async ({ client }) => {
    const response = await client.get('/clients')

    response.assertRedirectsTo('/login')
  })

  test('cannot update client from another organization (IDOR)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const otherUser = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'enterprise' })
    ).create()
    const foreignClient = await Client.create({
      organizationId: otherUser.organizationId!,
      firstName: 'Foreign',
      lastName: 'Client',
      status: 'active',
    })

    const response = await client.put(`/clients/${foreignClient.id}`).loginAs(user).form({
      firstName: 'Hacked',
      lastName: 'Client',
    })

    response.assertRedirectsTo('/clients')

    // Ensure the foreign client was not modified
    await foreignClient.refresh()
    assert.equal(foreignClient.firstName, 'Foreign')
  })

  test('cannot delete client from another organization (IDOR)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    const otherUser = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'enterprise' })
    ).create()
    const foreignClient = await Client.create({
      organizationId: otherUser.organizationId!,
      firstName: 'Foreign',
      lastName: 'Client',
      status: 'active',
    })

    const response = await client.delete(`/clients/${foreignClient.id}`).loginAs(user)

    response.assertRedirectsTo('/clients')

    // Ensure the foreign client still exists
    const stillExists = await Client.find(foreignClient.id)
    assert.isNotNull(stillExists)
  })
})
