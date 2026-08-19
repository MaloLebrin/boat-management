import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Auth login (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('redirects to /dashboard on valid credentials', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.post('/login').form({
      email: user.email,
      password: 'Password123!',
    })

    response.assertRedirectsTo('/dashboard')
  })

  test('does not redirect to /dashboard on wrong password', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.post('/login').form({
      email: user.email,
      password: 'WrongPassword!',
    })

    // With Inertia, invalid credentials redirect back to the login page (not dashboard)
    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    response.assert!.isFalse(redirectedToDashboard)
  })

  /**
   * Issue #470 — `E_INVALID_CREDENTIALS` flashait son message technique brut
   * (« Invalid user credentials ») dans le toast de /login. L'exception résout
   * son libellé via `i18n.t('errors.E_INVALID_CREDENTIALS')` : la clé doit
   * exister dans les deux locales, sinon Adonis retombe sur le message anglais
   * du framework.
   */
  test('flashes a translated error message on wrong password (fr)', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/login')
      .header('Accept-Language', 'fr')
      .form({ email: user.email, password: 'WrongPassword!' })
      .redirects(0)

    assert.equal(response.flashMessages().error, 'E-mail ou mot de passe incorrect.')
  })

  test('flashes a translated error message on wrong password (en)', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/login')
      .header('Accept-Language', 'en')
      .form({ email: user.email, password: 'WrongPassword!' })
      .redirects(0)

    assert.equal(response.flashMessages().error, 'Incorrect email or password.')
  })

  test('flashes a translated error message on unknown email', async ({ client, assert }) => {
    const response = await client
      .post('/login')
      .header('Accept-Language', 'fr')
      .form({ email: 'inconnu@example.com', password: 'Password123!' })
      .redirects(0)

    assert.equal(response.flashMessages().error, 'E-mail ou mot de passe incorrect.')
  })

  test('does not redirect to /dashboard when email is missing', async ({ client }) => {
    const response = await client.post('/login').form({
      password: 'Password123!',
    })

    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    response.assert!.isFalse(redirectedToDashboard)
  })

  test('GET /boats redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.get('/boats').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  /**
   * Même cause que #470 sur l'autre exception d'auth du framework : une
   * navigation invitée vers une page protégée flashait « Unauthorized access ».
   */
  test('GET /boats flashes a translated error when unauthenticated (fr)', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/boats').header('Accept-Language', 'fr').redirects(0)

    assert.equal(
      response.flashMessages().error,
      'Veuillez vous connecter pour accéder à cette page.'
    )
  })

  test('redirects an already-authenticated user away from /login to /dashboard', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client.get('/login').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
  })

  test('redirects an already-authenticated user away from /signup to /dashboard', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client.get('/signup').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
  })

  test('logout redirects away from dashboard', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.post('/logout').loginAs(user).redirects(0)

    response.assertStatus(302)
    // Should redirect to login or home, not stay logged in
    const location = response.header('location') as string
    response.assert!.notEqual(location, '/dashboard')
  })
})
