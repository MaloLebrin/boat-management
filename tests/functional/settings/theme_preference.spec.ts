import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'

test.group('Theme preference (#416)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PUT /settings/theme persists the preference and sets the cookie', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client
      .put('/settings/theme')
      .loginAs(user)
      .form({ theme: 'dark' })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(response.cookie('theme')?.value, 'dark')

    await user.refresh()
    assert.equal(user.theme, 'dark')
  })

  test('PUT /settings/theme rejects an unknown preference', async ({ client, assert }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client
      .put('/settings/theme')
      .loginAs(user)
      .form({ theme: 'sepia' })
      .redirects(0)

    response.assertStatus(302)

    await user.refresh()
    assert.isNull(user.theme)
  })

  test('PUT /settings/theme requires authentication', async ({ client }) => {
    const response = await client.put('/settings/theme').form({ theme: 'dark' }).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /theme works while logged out and only sets the cookie', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/theme').form({ theme: 'light' }).redirects(0)

    response.assertStatus(302)
    assert.equal(response.cookie('theme')?.value, 'light')
  })

  test('POST /theme also persists on the profile when authenticated', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()

    await client.post('/theme').loginAs(user).form({ theme: 'dark' }).redirects(0)

    await user.refresh()
    assert.equal(user.theme, 'dark')
  })

  test('POST /theme ignores an unknown value', async ({ client, assert }) => {
    const response = await client.post('/theme').form({ theme: 'sepia' }).redirects(0)

    response.assertStatus(302)
    assert.isUndefined(response.cookie('theme'))
  })
})

test.group('Theme resolution in the rendered page (#416)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an explicit preference is written on <html> server-side', async ({ client, assert }) => {
    const response = await client.get('/login').cookie('theme', 'dark')

    response.assertStatus(200)
    assert.include(response.text(), 'data-theme="dark"')
  })

  test('the `system` preference leaves data-theme empty for the client script', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/login')

    response.assertStatus(200)
    assert.include(response.text(), 'data-theme=""')
    // Le script anti-FOUC doit être présent pour résoudre `system`.
    assert.include(response.text(), 'prefers-color-scheme: dark')
  })

  test('the profile preference wins over the cookie', async ({ client, assert }) => {
    const user = await UserFactory.with('organization').create()
    user.theme = 'light'
    await user.save()

    const response = await client.get('/settings/me').loginAs(user).cookie('theme', 'dark')

    response.assertStatus(200)
    assert.include(response.text(), 'data-theme="light"')
  })

  test('the theme resolves on a page rendered without an authenticated user', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/en/pricing').cookie('theme', 'dark')

    response.assertStatus(200)
    assert.include(response.text(), 'data-theme="dark"')
  })
})
