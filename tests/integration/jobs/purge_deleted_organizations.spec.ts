import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import { withTrashed } from '#models/mixins/soft_deletes'
import { BoatFactory } from '#database/factories/boat_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import PurgeDeletedOrganizations from '#jobs/purge_deleted_organizations'
import { ORGANIZATION_DELETION_GRACE_DAYS } from '#shared/constants/account_deletion'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'

/**
 * Purge des organisations supprimées — cron quotidien 04:45 (#886).
 *
 * Purger trop tôt détruit une organisation encore récupérable ; oublier un
 * fichier laisse chez Cloudinary des documents que plus rien ne référence.
 */
test.group('PurgeDeletedOrganizations (cron 04:45)', (group) => {
  group.each.setup(() => swapFakeCloudinary())
  group.each.teardown(() => restoreCloudinary())

  test('purges organizations past the grace period, files and boats included', async ({
    assert,
  }) => {
    const cloud = swapFakeCloudinary()
    const expired = await OrganizationFactory.merge({
      deletionRequestedAt: DateTime.now().minus({ days: ORGANIZATION_DELETION_GRACE_DAYS + 1 }),
    }).create()
    const recent = await OrganizationFactory.merge({
      deletionRequestedAt: DateTime.now().minus({ days: 3 }),
    }).create()
    const admin = await UserFactory.merge({ organizationId: expired.id }).create()
    await OrganizationMembership.create({
      userId: admin.id,
      organizationId: expired.id,
      role: 'admin',
    })
    const boat = await BoatFactory.merge({ organizationId: expired.id }).create()
    const pdf = await MediaFactory.merge({
      organizationId: expired.id,
      entityType: 'boat',
      entityId: boat.id,
      kind: 'document',
      format: 'pdf',
    }).create()

    const job = await app.container.make(PurgeDeletedOrganizations)
    await job.execute()

    assert.isNull(await Organization.find(expired.id))
    assert.isNotNull(await Organization.find(recent.id))
    assert.isNull(await withTrashed(Boat.query().where('id', boat.id)).first())
    assert.deepInclude(cloud.deletedFiles, {
      publicId: pdf.cloudinaryPublicId,
      resourceType: 'raw',
    })
    await admin.refresh()
    assert.isNotNull(admin.anonymizedAt, 'an account left without organization is anonymized')
  })
})
