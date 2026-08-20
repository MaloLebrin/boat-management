import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

test.group('E2E · Boat lifecycle', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('create a boat through the form and land on its detail page', async ({
    browserContext,
    visit,
  }) => {
    const user = await createAdminUser()
    await browserContext.loginAs(user)

    const page = await visit('/boats/new')
    await page.waitForLoadState('networkidle')
    await page.locator('#name').fill('Brand New Sloop')
    // Scope to the create form — the layout also renders a /logout submit button.
    await page.locator('form[action="/boats"][method="post"] button[type="submit"]').click()

    // Controller redirects to /boats/:id on success.
    await page.waitForURL(/\/boats\/\d+$/)
    await page.assertTextContains('h1', 'Brand New Sloop')
  })

  test("edit a boat's name and see it reflected on the detail page", async ({
    browserContext,
    visit,
  }) => {
    const user = await createAdminUser()
    // motorboat avoids the "mastHeight required for sailboat" hull rule on update.
    const boat = await createBoatForUser(user, {
      name: 'Old Name Cruiser',
      propulsionType: 'motorboat',
    })
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}/edit`)
    await page.waitForLoadState('networkidle')
    // The edit form pre-fills the name from the boat once hydrated.
    await page.assertInputValue('#name', 'Old Name Cruiser')
    await page.locator('#name').fill('Renamed Cruiser')
    await page
      .locator(`form[action="/boats/${boat.id}"][method="put"] button[type="submit"]`)
      .click()

    await page.waitForURL(`**/boats/${boat.id}`)
    await page.assertTextContains('h1', 'Renamed Cruiser')
  })

  test('a boat appears in the fleet list', async ({ browserContext, visit, assert }) => {
    const user = await createAdminUser()
    await createBoatForUser(user, { name: 'Fleet List Cutter' })
    await browserContext.loginAs(user)

    const page = await visit('/boats')
    await page.waitForLoadState('networkidle')
    await page.assertPath('/boats')
    assert.include(await page.content(), 'Fleet List Cutter')
  })

  test('delete a boat from the edit page', async ({ browserContext, visit }) => {
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, {
      name: 'Doomed Dinghy',
      propulsionType: 'motorboat',
    })
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}/edit`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()

    await page.waitForURL('**/boats')
    // The boat is gone: its detail page now redirects back to the fleet list.
    await page.goto(`/boats/${boat.id}`, { waitUntil: 'domcontentloaded' })
    await page.assertPath('/boats')
  })
})
