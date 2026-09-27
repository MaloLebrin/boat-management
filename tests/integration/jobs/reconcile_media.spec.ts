import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import ace from '@adonisjs/core/services/ace'
import Media from '#models/media'
import Organization from '#models/organization'
import ReconcileMedia from '#jobs/reconcile_media'
import MediaReconcile from '../../../commands/media_reconcile.js'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'

/**
 * Réconciliation hebdomadaire des médias — cron du dimanche 03:30 (#859).
 *
 * Le job et la commande `media:reconcile` délèguent au même service, testé à
 * part : ici, on vérifie que chacun le branche avec le bon mode.
 */

async function storageOf(organizationId: number) {
  const org = await Organization.findOrFail(organizationId)
  return Number(org.storageUsedBytes)
}

async function seedDrift() {
  const org = await OrganizationFactory.merge({ storageUsedBytes: 9_000 }).create()
  const boat = await BoatFactory.merge({ organizationId: org.id }).create()
  await boat.delete()
  const orphan = await MediaFactory.merge({
    entityType: 'boat',
    entityId: boat.id,
    bytes: 9_000,
  }).create()
  return { org, orphan }
}

test.group('ReconcileMedia job', (group) => {
  group.each.teardown(() => restoreCloudinary())

  test('purge les orphelins et corrige le compteur de stockage', async ({ assert }) => {
    const cloud = swapFakeCloudinary()
    const { org, orphan } = await seedDrift()

    const job = await app.container.make(ReconcileMedia)
    await job.execute()

    assert.isNull(await Media.find(orphan.id))
    assert.include(cloud.deletedPublicIds, orphan.cloudinaryPublicId)
    assert.equal(await storageOf(org.id), 0)
  })
})

test.group('media:reconcile command', (group) => {
  group.each.setup(() => {
    ace.ui.switchMode('raw')
    return () => ace.ui.switchMode('normal')
  })
  group.each.teardown(() => restoreCloudinary())

  test('--dry-run rend compte de l’écart sans rien toucher', async ({ assert }) => {
    const cloud = swapFakeCloudinary()
    const { org, orphan } = await seedDrift()

    const command = await ace.create(MediaReconcile, ['--dry-run'])
    await command.exec()

    command.assertSucceeded()
    command.assertLogMatches(/\[dry-run\] Médias orphelins/)
    command.assertLogMatches(new RegExp(`organisation ${org.id} : 9000 → 0`))
    assert.isNotNull(await Media.find(orphan.id))
    assert.notInclude(cloud.deletedPublicIds, orphan.cloudinaryPublicId)
    assert.equal(await storageOf(org.id), 9_000)
  })

  test('sans --dry-run, corrige', async ({ assert }) => {
    swapFakeCloudinary()
    const { org, orphan } = await seedDrift()

    const command = await ace.create(MediaReconcile, [])
    await command.exec()

    command.assertSucceeded()
    assert.isNull(await Media.find(orphan.id))
    assert.equal(await storageOf(org.id), 0)
  })
})
