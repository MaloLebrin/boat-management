import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

test.group('E2E · Dashboard stat card links', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the Moteurs card leads to the engine-filtered fleet list', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    // One boat with an engine, one purely sailed (no engine) so the filter is
    // observable end-to-end, not just a matching URL.
    const motorBoat = await createBoatForUser(user, { name: 'Motor Yacht' })
    await BoatEngineFactory.merge({ boatId: motorBoat.id }).create()
    const sailBoat = await createBoatForUser(user, { name: 'Pure Sailer' })
    await BoatSailFactory.merge({ boatId: sailBoat.id }).create()

    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.waitForLoadState('networkidle')

    // Click the actual card link rather than navigating by URL.
    await page.locator('a[href="/boats?hasEngine=true"]').click()

    await page.waitForURL(/\/boats\?hasEngine=true/)
    await page.waitForLoadState('networkidle')
    const content = await page.content()
    assert.include(content, 'Motor Yacht')
    assert.notInclude(content, 'Pure Sailer')
  })

  test('each equipment card points to its own filtered destination', async ({
    browserContext,
    visit,
  }) => {
    const user = await createAdminUser()
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.waitForLoadState('networkidle')

    // The four equipment cards must resolve to distinct, content-matching URLs
    // (regression guard for #354, where all of them pointed to /boats).
    await page.assertExists('a[href="/boats"]')
    await page.assertExists('a[href="/boats?hasEngine=true"]')
    await page.assertExists('a[href="/boats?hasSails=true"]')
    await page.assertExists('a[href="/boats?hasRig=true"]')
  })
})
