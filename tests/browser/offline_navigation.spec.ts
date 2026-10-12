import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

/**
 * Navigation Inertia hors-ligne (#968).
 *
 * Le service worker est désactivé sous test (`vite.config.ts`, #496) : aucune
 * page n'est en cache, on ne peut donc pas prouver ici que le SW sert la copie.
 * On prouve la couture côté client : quand la visite XHR `X-Inertia` reste
 * sans réponse, l'app bascule en navigation pleine page — celle que le SW
 * intercepte en production. Pour l'observer, seules les requêtes Inertia sont
 * coupées ; le document passe et la page cible s'affiche.
 */
test.group('Browser — offline Inertia navigation', (group) => {
  group.each.setup(() => truncateDb())

  test('a link whose Inertia visit gets no response falls back to a full page load', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, { name: 'Passage Sloop' })
    await browserContext.loginAs(user)

    const page = await visit('/boats')
    await browserContext.route('**/*', (route) =>
      route.request().headers()['x-inertia'] ? route.abort() : route.continue()
    )

    const documentLoad = page.waitForRequest(
      (request) =>
        request.resourceType() === 'document' &&
        new URL(request.url()).pathname === `/boats/${boat.id}`
    )
    await page.locator(`a[href$="/boats/${boat.id}"]`).first().click()
    await documentLoad

    await page.waitForURL(`**/boats/${boat.id}`)
    await page.getByRole('heading', { name: 'Passage Sloop' }).first().waitFor()
    assert.equal(new URL(page.url()).pathname, `/boats/${boat.id}`)
  })
})
