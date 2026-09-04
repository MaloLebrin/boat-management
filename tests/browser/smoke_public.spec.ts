import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'

/**
 * Navigable smoke test for the public / marketing surface — no authentication.
 * Each page must respond without an HTTP error.
 */
test.group('E2E · Public screens smoke', (group) => {
  group.each.setup(() => truncateDb())

  test('public and marketing pages render in both locales', async ({ visit, assert }) => {
    const urls = [
      '/en',
      '/fr',
      '/en/pricing',
      '/fr/tarifs',
      '/en/maintenance-cost-simulator',
      '/fr/simulateur-cout-entretien',
      '/en/about',
      '/fr/a-propos',
      '/contact',
      '/en/privacy',
      '/fr/confidentialite',
      '/en/sales-terms',
      '/fr/cgv',
      '/en/legal-notice',
      '/fr/mentions-legales',
    ]

    const page = await visit('/en')
    for (const url of urls) {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
      assert.isNotNull(response, `no response for ${url}`)
      assert.isBelow(response!.status(), 400, `${url} returned HTTP ${response!.status()}`)
      await page.assertPath(url)
    }
  })

  test('the login page is reachable and shows the email field', async ({ visit }) => {
    const page = await visit('/login')
    await page.assertPath('/login')
    await page.assertExists('#email')
    await page.assertExists('#password')
  })
})
