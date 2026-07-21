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
