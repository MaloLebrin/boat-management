import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import OrganizationMembership from '#models/organization_membership'

test.group('Auth signup (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates account and redirects to /dashboard', async ({ client, assert }) => {
    const response = await client.post('/signup').form({
      fullName: 'Marie Curie',
      email: 'marie@example.com',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
    })

    response.assertRedirectsTo('/dashboard')

    const user = await User.findBy('email', 'marie@example.com')
    assert.isNotNull(user)
    assert.equal(user!.fullName, 'Marie Curie')
  })

  test('creates an admin membership for the new user', async ({ client, assert }) => {
    await client.post('/signup').form({
      fullName: 'Jean Valjean',
      email: 'jean@example.com',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
    })

    const user = await User.findByOrFail('email', 'jean@example.com')
    const membership = await OrganizationMembership.query()
      .where('userId', user.id)
      .where('organizationId', user.organizationId!)
      .first()

    assert.isNotNull(membership)
    assert.equal(membership!.role, 'admin')
  })

  test('does not create account when email is already taken', async ({ client, assert }) => {
    // Create first user
    await client.post('/signup').form({
      fullName: 'First User',
      email: 'taken@example.com',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
    })

    // Try to create second user with same email
    const response = await client.post('/signup').form({
      fullName: 'Second User',
      email: 'taken@example.com',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
    })

    // Inertia validation errors: redirect back, not to /dashboard
    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    assert.isFalse(redirectedToDashboard)

    const count = await User.query().where('email', 'taken@example.com').count('* as total')
    assert.equal(Number(count[0].$extras.total), 1)
  })

  test('does not create account when password confirmation does not match', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/signup').form({
      fullName: 'Test User',
      email: 'mismatch@example.com',
      password: 'Password123!',
      passwordConfirmation: 'DifferentPassword!',
    })

    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    assert.isFalse(redirectedToDashboard)

    const user = await User.findBy('email', 'mismatch@example.com')
    assert.isNull(user)
  })

  test('GET /signup is accessible to guests', async ({ client }) => {
    const response = await client.get('/signup')

    response.assertStatus(200)
  })
})
