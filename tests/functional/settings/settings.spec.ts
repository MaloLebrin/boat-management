import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Settings (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /settings/me returns 200 for authenticated user', async ({ client }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client.get('/settings/me').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /settings/me redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.get('/settings/me').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /settings/org returns 200 for authenticated user', async ({ client }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client.get('/settings/org').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /settings/org redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.get('/settings/org').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('PUT /settings/profile updates fullName and redirects back', async ({ client, assert }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client
      .put('/settings/profile')
      .loginAs(user)
      .form({ fullName: 'Jean Dupont' })

    response.assertStatus(302)

    await user.refresh()
    assert.equal(user.fullName, 'Jean Dupont')
  })

  test('PUT /settings/org updates organization name and redirects back', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    await admin.load('organization')

    const response = await client
      .put('/settings/org')
      .loginAs(admin)
      .form({ name: 'Nouvelle Organisation' })

    response.assertStatus(302)

    await admin.organization.refresh()
    assert.equal(admin.organization.name, 'Nouvelle Organisation')
  })

  test('PUT /settings/org with empty name does not update', async ({ client, assert }) => {
    const admin = await createAdminUser()
    await admin.load('organization')
    const originalName = admin.organization.name

    const response = await client.put('/settings/org').loginAs(admin).form({ name: '' })

    const redirectedToOrgUpdate = response
      .redirects()
      .some((url) => url.includes('/settings/org') && !url.endsWith('/settings/org'))
    assert.isFalse(redirectedToOrgUpdate)

    await admin.organization.refresh()
    assert.equal(admin.organization.name, originalName)
  })
})
