import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  createBoatForUser,
  createEnterpriseAdminUser,
  createPortForUser,
} from '#tests/browser/helpers'

/**
 * Navigable smoke test: log in once and load every main authenticated screen,
 * asserting each responds without an HTTP error and stays on its own URL
 * (i.e. is not bounced to /login or an error page).
 */
test.group('E2E · Authenticated screens smoke', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('every main authenticated screen renders', async ({ browserContext, visit, assert }) => {
    // Enterprise plan so plan-gated screens (AI, branding, clients) are reachable.
    const user = await createEnterpriseAdminUser()
    const boat = await createBoatForUser(user, { name: 'Smoke Test Boat' })
    await createPortForUser(user, 'Smoke Test Marina')
    await browserContext.loginAs(user)

    const urls = [
      '/dashboard',
      '/boats',
      `/boats/${boat.id}`,
      '/planning',
      '/maintenance/history',
      '/navigation/logbook',
      '/navigation/fuel',
      '/navigation/incidents',
      '/reservations',
      '/ports',
      '/crew',
      '/clients',
      '/notifications',
      '/settings/me',
      '/settings/org',
      '/settings/members',
      '/settings/billing',
      '/settings/ai',
      '/settings/branding',
      '/settings/audit-log',
    ]

    const page = await visit('/dashboard')
    for (const url of urls) {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
      assert.isNotNull(response, `no response for ${url}`)
      assert.isBelow(response!.status(), 400, `${url} returned HTTP ${response!.status()}`)
      await page.assertPath(url)
    }
  })
})
