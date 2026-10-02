import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import OrganizationMembership from '#models/organization_membership'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import PurgeDeletedAccounts from '#jobs/purge_deleted_accounts'
import { ACCOUNT_DELETION_GRACE_DAYS } from '#shared/constants/account_deletion'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'

/**
 * Purge des comptes supprimés — cron quotidien 04:30 (#886).
 *
 * Deux façons de se tromper :
 * - purger pendant la rétractation ⇒ un compte qui pouvait encore revenir est
 *   anonymisé ;
 * - ne jamais purger ⇒ la promesse d'effacement n'est pas tenue.
 */
test.group('PurgeDeletedAccounts (cron 04:30)', (group) => {
  group.each.setup(() => swapFakeCloudinary())
  group.each.teardown(() => restoreCloudinary())

  test('anonymizes accounts past the grace period and keeps the others', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
    const expired = await UserFactory.merge({
      organizationId: org.id,
      deletionRequestedAt: DateTime.now().minus({ days: ACCOUNT_DELETION_GRACE_DAYS + 1 }),
    }).create()
    await OrganizationMembership.create({
      userId: expired.id,
      organizationId: org.id,
      role: 'member',
    })
    const recent = await UserFactory.merge({
      organizationId: org.id,
      deletionRequestedAt: DateTime.now().minus({ days: ACCOUNT_DELETION_GRACE_DAYS - 1 }),
    }).create()

    const job = await app.container.make(PurgeDeletedAccounts)
    await job.execute()

    await expired.refresh()
    assert.isNotNull(expired.anonymizedAt)
    assert.match(expired.email, /^deleted-user-\d+@deleted\.invalid$/)
    assert.isNull(await OrganizationMembership.query().where('userId', expired.id).first())
    await recent.refresh()
    assert.isNull(recent.anonymizedAt)
  })

  test('postpones an account that became the last admin of an active organization', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const lastAdmin = await UserFactory.merge({
      organizationId: org.id,
      deletionRequestedAt: DateTime.now().minus({ days: ACCOUNT_DELETION_GRACE_DAYS + 1 }),
    }).create()
    await OrganizationMembership.create({
      userId: lastAdmin.id,
      organizationId: org.id,
      role: 'admin',
    })

    const job = await app.container.make(PurgeDeletedAccounts)
    await job.execute()

    await lastAdmin.refresh()
    assert.isNull(lastAdmin.anonymizedAt)
  })
})
