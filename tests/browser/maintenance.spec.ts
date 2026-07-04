import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  createAdminUser,
  createBoatForUser,
  createMaintenanceEventForBoat,
} from '#tests/browser/helpers'

test.group('E2E · Maintenance history', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('/maintenance redirects to the history view', async ({ browserContext, visit }) => {
    const user = await createAdminUser()
    await browserContext.loginAs(user)

    const page = await visit('/maintenance')

    await page.assertPath('/maintenance/history')
  })

  test('a performed maintenance event shows up in the history timeline', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, { name: 'Serviced Schooner' })
    await createMaintenanceEventForBoat(boat, {
      title: 'E2E winter engine overhaul',
      subject: 'engine',
    })
    await browserContext.loginAs(user)

    const page = await visit('/maintenance/history')
    await page.waitForLoadState('networkidle')

    await page.assertPath('/maintenance/history')
    const content = await page.content()
    assert.include(content, 'E2E winter engine overhaul')
    assert.include(content, 'Serviced Schooner')
  })
})
