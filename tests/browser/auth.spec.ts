import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
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
