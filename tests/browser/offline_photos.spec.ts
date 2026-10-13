import { test } from '@japa/runner'
import Media from '#models/media'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

/**
 * Photo prise hors-ligne puis synchronisée (#969), dans un vrai navigateur.
 *
 * Les moitiés sont prouvées ailleurs — la file avec pièces jointes en Vitest
 * (`use_offline_queue`, `use_offline_photos`), le rejeu multipart et ses
 * marqueurs en fonctionnel (`offline_photo_replay`). Ce test prouve le raccord :
 * sélection de fichier → IndexedDB (octets compris) → vignette « en attente »
 * → retour du réseau → `drainQueue` → multipart → Cloudinary → base.
 *
 * ⚠️ Comme `offline_queue.spec.ts` : ne jamais naviguer pendant la coupure, le
 * service worker est désactivé sous test.
 */

/** PNG 1×1 : décodable par Chromium, accepté par le validateur. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)

test.group('E2E · Offline photos', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => restoreCloudinary())

  test('a photo taken offline waits in the queue, then syncs once back online', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, { name: 'Offline Sloop' })
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}?tab=photos`)
    await page.waitForLoadState('networkidle')

    await browserContext.setOffline(true)
    await page
      .locator('input[type="file"][multiple]')
      .setInputFiles({ name: 'avarie.png', mimeType: 'image/png', buffer: PNG })

    // La vignette lit les octets dans IndexedDB : la photo est gardée sur l'appareil.
    await page.locator('[data-testid="pending-photo"]').waitFor()
    assert.lengthOf(await Media.query().where('entityType', 'boat'), 0)
    assert.lengthOf(fake.uploaded, 0)

    // `online` → probe `HEAD /up` → `drainQueue` (#953) → rejeu multipart.
    await browserContext.setOffline(false)
    await page.locator('[data-testid="pending-photo"]').waitFor({ state: 'detached' })

    const media = await Media.query().where('entityType', 'boat').where('entityId', boat.id)
    assert.lengthOf(media, 1)
    assert.equal(media[0].kind, 'photo')
    assert.lengthOf(fake.uploaded, 1)
  })
})
