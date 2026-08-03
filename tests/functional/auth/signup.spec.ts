import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import User from '#models/user'
import OrganizationMembership from '#models/organization_membership'

/**
 * The signup form posts firstName / lastName / organizationName /
 * organizationType / fleetSize / acceptTerms — the validator must accept
 * exactly that shape, otherwise the page fails silently (#448).
 */
function signupForm(overrides: Record<string, string> = {}) {
  return {
    firstName: 'Marie',
    lastName: 'Curie',
    email: 'marie@example.com',
    password: 'Password123!',
    organizationName: 'Marina Bleue',
    organizationType: 'marina',
    fleetSize: '5-20',
    acceptTerms: 'on',
    ...overrides,
  }
}

test.group('Auth signup (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates account and redirects to /dashboard', async ({ client, assert }) => {
    const response = await client.post('/signup').form(signupForm())

    response.assertRedirectsTo('/dashboard')

    const user = await User.findBy('email', 'marie@example.com')
    assert.isNotNull(user)
    assert.equal(user!.fullName, 'Marie Curie')
  })

  test('persists the organization name, type and fleet size', async ({ client, assert }) => {
    await client.post('/signup').form(signupForm())

    const user = await User.findByOrFail('email', 'marie@example.com')
    const organization = await Organization.findOrFail(user.organizationId!)

    assert.equal(organization.name, 'Marina Bleue')
    assert.equal(organization.type, 'marina')
    assert.equal(organization.fleetSize, '5-20')
    assert.include(organization.slug, 'marina-bleue')
  })

  test('accepts a signup without organization type nor fleet size', async ({ client, assert }) => {
    const response = await client
      .post('/signup')
      .form(signupForm({ organizationType: '', fleetSize: '' }))

    response.assertRedirectsTo('/dashboard')

    const user = await User.findByOrFail('email', 'marie@example.com')
    const organization = await Organization.findOrFail(user.organizationId!)

    assert.isNull(organization.type)
    assert.isNull(organization.fleetSize)
  })

  test('creates an admin membership for the new user', async ({ client, assert }) => {
    await client.post('/signup').form(signupForm({ email: 'jean@example.com' }))

    const user = await User.findByOrFail('email', 'jean@example.com')
    const membership = await OrganizationMembership.query()
      .where('userId', user.id)
      .where('organizationId', user.organizationId!)
      .first()

    assert.isNotNull(membership)
    assert.equal(membership!.role, 'admin')
  })

  test('does not create account when email is already taken', async ({ client, assert }) => {
    await client.post('/signup').form(signupForm({ email: 'taken@example.com' }))

    const response = await client.post('/signup').form(signupForm({ email: 'taken@example.com' }))

    // Inertia validation errors: redirect back, not to /dashboard
    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    assert.isFalse(redirectedToDashboard)

    const count = await User.query().where('email', 'taken@example.com').count('* as total')
    assert.equal(Number(count[0].$extras.total), 1)
  })

  test('does not create account when the terms are not accepted', async ({ client, assert }) => {
    const { acceptTerms, ...withoutTerms } = signupForm()
    assert.equal(acceptTerms, 'on')

    const response = await client.post('/signup').form(withoutTerms)

    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    assert.isFalse(redirectedToDashboard)
    assert.isNull(await User.findBy('email', 'marie@example.com'))
  })

  test('does not create account when the organization name is missing', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/signup').form(signupForm({ organizationName: '' }))

    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    assert.isFalse(redirectedToDashboard)
    assert.isNull(await User.findBy('email', 'marie@example.com'))
  })

  test('does not create account when the organization type is not a known value', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/signup').form(signupForm({ organizationType: 'pirate' }))

    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    assert.isFalse(redirectedToDashboard)
    assert.isNull(await User.findBy('email', 'marie@example.com'))
  })

  test('does not require a password confirmation field', async ({ client, assert }) => {
    // Regression #448: the form has no confirmation input, so requiring one
    // rejected every single signup with an error nothing could display.
    const response = await client.post('/signup').form(signupForm())

    response.assertRedirectsTo('/dashboard')
    assert.isNotNull(await User.findBy('email', 'marie@example.com'))
  })

  test('trims first and last name before storing them', async ({ client, assert }) => {
    await client
      .post('/signup')
      .form(signupForm({ firstName: '  Ada  ', lastName: '  Lovelace  ' }))

    const user = await User.findByOrFail('email', 'marie@example.com')
    assert.equal(user.fullName, 'Ada Lovelace')
  })

  test('does not create account when first name is only whitespace', async ({ client, assert }) => {
    const response = await client.post('/signup').form(signupForm({ firstName: '   ' }))

    const redirectedToDashboard = response.redirects().some((url) => url.includes('/dashboard'))
    assert.isFalse(redirectedToDashboard)
    assert.isNull(await User.findBy('email', 'marie@example.com'))
  })

  test('GET /signup is accessible to guests', async ({ client }) => {
    const response = await client.get('/signup')

    response.assertStatus(200)
  })
})
