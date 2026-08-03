import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import User from '#models/user'
import { createAdminUser, DEFAULT_PASSWORD } from '#tests/browser/helpers'

test.group('E2E · Authentication', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a user logs in through the real /login form and lands on the dashboard', async ({
    visit,
  }) => {
    const user = await createAdminUser()

    const page = await visit('/login')
    // Wait for client hydration before filling — otherwise Vue re-hydrates the
    // (uncontrolled) inputs after Playwright has typed and clears their value.
    await page.waitForLoadState('networkidle')
    await page.locator('#email').fill(user.email)
    await page.locator('#password').fill(DEFAULT_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard')
    await page.assertPath('/dashboard')
  })

  test('wrong password keeps the user on the login page', async ({ visit }) => {
    const user = await createAdminUser()

    const page = await visit('/login')
    await page.waitForLoadState('networkidle')
    await page.locator('#email').fill(user.email)
    await page.locator('#password').fill('WrongPassword!')
    await page.locator('button[type="submit"]').click()

    // Inertia redirects invalid credentials back to /login (never to /dashboard).
    await page.waitForLoadState('networkidle')
    await page.assertPath('/login')
    // The dashboard must not be reachable — the submit really happened and failed.
    await page.assertExists('#email')
  })

  /**
   * Regression #448 — the only level that reproduces the reported failure.
   * Every field is filled through the real DOM, so a validator expecting a
   * field the page does not render fails here exactly as it did in production:
   * back on /signup, no account, no message.
   */
  test('a visitor creates an account through the real /signup form', async ({ visit, assert }) => {
    const page = await visit('/signup')
    await page.waitForLoadState('networkidle')

    await page.locator('#firstName').fill('Marie')
    await page.locator('#lastName').fill('Curie')
    await page.locator('#email').fill('marie.e2e@example.com')
    await page.locator('#password').fill(DEFAULT_PASSWORD)
    await page.locator('#organizationName').fill('Marina Bleue')
    await page.locator('#organizationType').selectOption('marina')
    await page.locator('#fleetSize').selectOption('5-20')
    await page.locator('#acceptTerms').check()
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard')
    await page.assertPath('/dashboard')

    const user = await User.findBy('email', 'marie.e2e@example.com')
    assert.isNotNull(user)
    assert.equal(user!.fullName, 'Marie Curie')

    const organization = await Organization.findOrFail(user!.organizationId!)
    assert.equal(organization.name, 'Marina Bleue')
    assert.equal(organization.type, 'marina')
    assert.equal(organization.fleetSize, '5-20')
  })

  test('a rejected signup shows an error instead of silently re-rendering', async ({
    visit,
    assert,
  }) => {
    const existing = await createAdminUser()

    const page = await visit('/signup')
    await page.waitForLoadState('networkidle')

    await page.locator('#firstName').fill('Marie')
    await page.locator('#lastName').fill('Curie')
    await page.locator('#email').fill(existing.email)
    await page.locator('#password').fill(DEFAULT_PASSWORD)
    await page.locator('#organizationName').fill('Marina Bleue')
    await page.locator('#acceptTerms').check()
    await page.locator('button[type="submit"]').click()

    await page.waitForLoadState('networkidle')
    await page.assertPath('/signup')

    // The failure must be visible — that is the whole point of #448.
    await page.locator('[data-invalid="true"]').first().waitFor()
    const alerts = await page.locator('[role="alert"]').allTextContents()
    assert.isAbove(alerts.length, 0)
  })

  test('an unauthenticated visit to /boats redirects to /login', async ({ visit }) => {
    const page = await visit('/boats')

    await page.assertPath('/login')
  })

  test('an authenticated user can reach the dashboard, then log out', async ({
    browserContext,
    visit,
  }) => {
    const user = await createAdminUser()
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.assertPath('/dashboard')

    // Log out via the session.destroy form (action="/logout").
    await page.locator('form[action="/logout"] button[type="submit"]').first().click()
    await page.waitForURL('**/login')
    await page.assertPath('/login')
  })
})
