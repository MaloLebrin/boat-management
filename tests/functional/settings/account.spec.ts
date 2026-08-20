import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import hash from '@adonisjs/core/services/hash'
import { UserFactory } from '#database/factories/user_factory'

test.group('Settings account — password & locale (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PUT /settings/password changes the password with valid current password', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ password: 'oldPassword1' }).with('organization').create()

    const response = await client
      .put('/settings/password')
      .loginAs(user)
      .withInertia()
      .form({
        currentPassword: 'oldPassword1',
        password: 'newPassword1',
        passwordConfirmation: 'newPassword1',
      })
      .redirects(0)

    response.assertStatus(303)

    await user.refresh()
    assert.isTrue(await hash.verify(user.password, 'newPassword1'))
  })

  test('PUT /settings/password rejects a wrong current password', async ({ client, assert }) => {
    const user = await UserFactory.merge({ password: 'oldPassword1' }).with('organization').create()

    const response = await client
      .put('/settings/password')
      .loginAs(user)
      .withInertia()
      .form({
        currentPassword: 'wrongPassword',
        password: 'newPassword1',
        passwordConfirmation: 'newPassword1',
      })
      .redirects(0)

    response.assertStatus(303)

    await user.refresh()
    // Password is unchanged.
    assert.isTrue(await hash.verify(user.password, 'oldPassword1'))
  })

  test('PUT /settings/password rejects a mismatched confirmation', async ({ client, assert }) => {
    const user = await UserFactory.merge({ password: 'oldPassword1' }).with('organization').create()

    const response = await client
      .put('/settings/password')
      .loginAs(user)
      .withInertia()
      .form({
        currentPassword: 'oldPassword1',
        password: 'newPassword1',
        passwordConfirmation: 'different1',
      })
      .redirects(0)

    response.assertStatus(303)

    await user.refresh()
    assert.isTrue(await hash.verify(user.password, 'oldPassword1'))
  })

  test('PUT /settings/password redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client
      .put('/settings/password')
      .form({
        currentPassword: 'x',
        password: 'newPassword1',
        passwordConfirmation: 'newPassword1',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('PUT /settings/locale persists the language preference on the profile', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client
      .put('/settings/locale')
      .loginAs(user)
      .withInertia()
      .form({ locale: 'fr' })
      .redirects(0)

    response.assertStatus(303)

    await user.refresh()
    assert.equal(user.locale, 'fr')
  })

  test('PUT /settings/locale rejects an unsupported locale', async ({ client, assert }) => {
    const user = await UserFactory.with('organization').create()

    await client
      .put('/settings/locale')
      .loginAs(user)
      .withInertia()
      .form({ locale: 'de' })
      .redirects(0)

    await user.refresh()
    assert.isNull(user.locale)
  })

  test('POST /locale persists the preference for an authenticated user', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()

    await client.post('/locale').loginAs(user).form({ locale: 'fr' }).redirects(0)

    await user.refresh()
    assert.equal(user.locale, 'fr')
  })

  test('persisted profile locale drives the resolved locale over Accept-Language', async ({
    client,
  }) => {
    const user = await UserFactory.merge({ locale: 'fr' }).with('organization').create()

    const response = await client
      .get('/settings/me')
      .loginAs(user)
      .withInertia()
      .header('Accept-Language', 'en-US,en;q=0.9')

    response.assertInertiaPropsContains({ locale: 'fr' })
  })
})
