import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

/**
 * Régénère les captures du manifeste (#865). Hors CI : un décalage de pixels
 * ferait échouer la suite sans rien dire du comportement.
 *
 *   UPDATE_PWA_SCREENSHOTS=1 node ace test --suite browser --files tests/browser/pwa_screenshots.spec.ts
 */
test.group('PWA screenshots (#865)', (group) => {
  group.each.setup(() => truncateDb())

  test('écrit les captures wide et narrow du tableau de bord', async ({
    browserContext,
    visit,
    assert,
  }) => {
    if (process.env.UPDATE_PWA_SCREENSHOTS !== '1') {
      assert.isTrue(true)
      return
    }

    const user = await createAdminUser()
    user.fullName = 'Camille Martin'
    user.email = 'camille@example.com'
    await user.save()
    await createBoatForUser(user, { name: 'Albatros' })
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.setViewportSize({ width: 1280, height: 720 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: app.publicPath('pwa/screenshot-wide.png') })

    await page.setViewportSize({ width: 720, height: 1280 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: app.publicPath('pwa/screenshot-narrow.png') })
  })
})
