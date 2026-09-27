import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import Media from '#models/media'
import Organization from '#models/organization'
import MediaReconciliationService from '#services/media_reconciliation_service'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { ClientFactory } from '#database/factories/client_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'

/**
 * Réconciliation des médias (#859).
 *
 * La table `media` est polymorphe, sans clé étrangère : une entité supprimée
 * laisse ses médias derrière elle si le service qui la supprime oublie de les
 * nettoyer, et le compteur `storage_used_bytes` dérive au fil des suppressions
 * partielles. La base de test est partagée entre les specs : les assertions ne
 * portent que sur les lignes et les organisations créées ici.
 */

async function reconcile(dryRun = false) {
  const service = await app.container.make(MediaReconciliationService)
  return service.reconcile({ dryRun })
}

async function deletedBoatId(organizationId: number) {
  const boat = await BoatFactory.merge({ organizationId }).create()
  await boat.delete()
  return boat.id
}

async function storageOf(organizationId: number) {
  const org = await Organization.findOrFail(organizationId)
  return Number(org.storageUsedBytes)
}

test.group('MediaReconciliationService — orphans', (group) => {
  group.each.teardown(() => restoreCloudinary())

  test('supprime sur Cloudinary puis en base les médias dont l’entité a disparu', async ({
    assert,
  }) => {
    const cloud = swapFakeCloudinary()
    const org = await OrganizationFactory.create()
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()
    const kept = await MediaFactory.merge({ entityType: 'boat', entityId: boat.id }).create()
    const orphanPhoto = await MediaFactory.merge({
      entityType: 'boat',
      entityId: await deletedBoatId(org.id),
    }).create()
    const orphanPdf = await MediaFactory.merge({
      entityType: 'client',
      entityId: 2_000_000_000,
      kind: 'document',
      format: 'pdf',
    }).create()

    const report = await reconcile()

    assert.isNull(await Media.find(orphanPhoto.id))
    assert.isNull(await Media.find(orphanPdf.id))
    assert.isNotNull(await Media.find(kept.id))
    assert.deepInclude(cloud.deletedFiles, {
      publicId: orphanPhoto.cloudinaryPublicId,
      resourceType: 'image',
    })
    assert.deepInclude(cloud.deletedFiles, {
      publicId: orphanPdf.cloudinaryPublicId,
      resourceType: 'raw',
    })
    assert.notInclude(cloud.deletedPublicIds, kept.cloudinaryPublicId)
    assert.isAtLeast(report.orphans.deleted, 2)
    assert.isAtLeast(report.orphans.byEntityType.client ?? 0, 1)
  })

  test('résout les entités imbriquées : une pièce dont le moteur existe encore est gardée', async ({
    assert,
  }) => {
    swapFakeCloudinary()
    const org = await OrganizationFactory.create()
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
    const partMedia = await MediaFactory.merge({
      entityType: 'boat_engine_part',
      entityId: part.id,
    }).create()

    await reconcile()

    assert.isNotNull(await Media.find(partMedia.id))
  })

  test('un échec Cloudinary garde la ligne, et la passe suivante la rattrape', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const orphan = await MediaFactory.merge({
      entityType: 'boat',
      entityId: await deletedBoatId(org.id),
    }).create()

    swapFakeCloudinary({ failDeleteFor: [orphan.cloudinaryPublicId] })
    const first = await reconcile()

    assert.isNotNull(await Media.find(orphan.id), 'le fichier est encore sur Cloudinary')
    assert.isAtLeast(first.orphans.failed, 1)

    restoreCloudinary()
    const cloud = swapFakeCloudinary()
    await reconcile()

    assert.isNull(await Media.find(orphan.id))
    assert.include(cloud.deletedPublicIds, orphan.cloudinaryPublicId)
  })

  test('--dry-run décrit les orphelins sans rien supprimer', async ({ assert }) => {
    const cloud = swapFakeCloudinary()
    const org = await OrganizationFactory.merge({ storageUsedBytes: 12_345 }).create()
    const orphan = await MediaFactory.merge({
      entityType: 'boat',
      entityId: await deletedBoatId(org.id),
      bytes: 4_000,
    }).create()

    const report = await reconcile(true)

    assert.isTrue(report.dryRun)
    assert.isNotNull(await Media.find(orphan.id))
    assert.notInclude(cloud.deletedPublicIds, orphan.cloudinaryPublicId)
    assert.isAtLeast(report.orphans.found, 1)
    assert.isAtLeast(report.orphans.bytes, 4_000)
    assert.equal(report.orphans.deleted, 0)
    // Le compteur est signalé mais pas corrigé.
    assert.deepInclude(report.storage.drifts, {
      organizationId: org.id,
      recordedBytes: 12_345,
      actualBytes: 0,
    })
    assert.equal(await storageOf(org.id), 12_345)
  })
})

test.group('MediaReconciliationService — storage_used_bytes', (group) => {
  group.each.teardown(() => restoreCloudinary())

  test('recalcule le compteur depuis les médias de l’organisation, avatars exclus', async ({
    assert,
  }) => {
    swapFakeCloudinary()
    const org = await OrganizationFactory.merge({ storageUsedBytes: 99_999 }).create()
    const other = await OrganizationFactory.merge({ storageUsedBytes: 0 }).create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
    const client = await ClientFactory.merge({ organizationId: org.id }).create()
    const otherBoat = await BoatFactory.merge({ organizationId: other.id }).create()

    await MediaFactory.merge({ entityType: 'boat', entityId: boat.id, bytes: 1_000 }).create()
    await MediaFactory.merge({
      entityType: 'boat_engine_part',
      entityId: part.id,
      bytes: 2_000,
    }).create()
    await MediaFactory.merge({ entityType: 'client', entityId: client.id, bytes: 500 }).create()
    // Les avatars ne sont pas comptés dans le quota (`MediaService.upload`).
    await MediaFactory.merge({ entityType: 'user', entityId: user.id, bytes: 700 }).create()
    await MediaFactory.merge({ entityType: 'boat', entityId: otherBoat.id, bytes: 300 }).create()

    const report = await reconcile()

    assert.equal(await storageOf(org.id), 3_500)
    assert.equal(await storageOf(other.id), 300)
    assert.deepInclude(report.storage.drifts, {
      organizationId: org.id,
      recordedBytes: 99_999,
      actualBytes: 3_500,
    })
    assert.isAtLeast(report.storage.corrected, 2)
  })

  test('remet à zéro une organisation sans aucun média, et laisse un compteur juste intact', async ({
    assert,
  }) => {
    swapFakeCloudinary()
    const empty = await OrganizationFactory.merge({ storageUsedBytes: 5_000 }).create()
    const exact = await OrganizationFactory.merge({ storageUsedBytes: 1_000 }).create()
    const boat = await BoatFactory.merge({ organizationId: exact.id }).create()
    await MediaFactory.merge({ entityType: 'boat', entityId: boat.id, bytes: 1_000 }).create()

    const report = await reconcile()

    assert.equal(await storageOf(empty.id), 0)
    assert.equal(await storageOf(exact.id), 1_000)
    assert.notExists(report.storage.drifts.find((d) => d.organizationId === exact.id))
  })

  test('un bateau supprimé sans nettoyage : orphelins purgés et quota rendu', async ({
    assert,
  }) => {
    // Le scénario de l'issue : le compteur a été incrémenté à l'upload, puis
    // l'entité est partie sans que ses médias soient nettoyés.
    const cloud = swapFakeCloudinary()
    const org = await OrganizationFactory.merge({ storageUsedBytes: 3_000 }).create()
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()
    const keptMedia = await MediaFactory.merge({
      entityType: 'boat',
      entityId: boat.id,
      bytes: 1_000,
    }).create()
    const lost = await MediaFactory.merge({
      entityType: 'boat',
      entityId: await deletedBoatId(org.id),
      bytes: 2_000,
    }).create()

    await reconcile()

    assert.isNull(await Media.find(lost.id))
    assert.include(cloud.deletedPublicIds, lost.cloudinaryPublicId)
    assert.isNotNull(await Media.find(keptMedia.id))
    assert.equal(await storageOf(org.id), 1_000)
  })
})
