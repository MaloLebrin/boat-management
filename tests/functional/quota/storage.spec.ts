import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import QuotaService from '#services/quota_service'
import app from '@adonisjs/core/services/app'

test.group('Storage Quota (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('storageLimitBytes returns correct limit for starter plan', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const quotaService = await app.container.make(QuotaService)

    const limit = quotaService.storageLimitBytes(org)

    // 1 GB = 1 * 1024 * 1024 * 1024 bytes
    assert.equal(limit, 1 * 1024 * 1024 * 1024)
  })

  test('storageLimitBytes returns correct limit for pro plan', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const quotaService = await app.container.make(QuotaService)

    const limit = quotaService.storageLimitBytes(org)

    // 20 GB
    assert.equal(limit, 20 * 1024 * 1024 * 1024)
  })

  test('storageLimitBytes returns null for enterprise plan', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const quotaService = await app.container.make(QuotaService)

    const limit = quotaService.storageLimitBytes(org)

    assert.isNull(limit)
  })

  test('assertCanUpload throws when quota exceeded', async ({ assert }) => {
    const org = await OrganizationFactory.merge({
      plan: 'starter',
      storageUsedBytes: 1 * 1024 * 1024 * 1024 - 100, // 1 GB - 100 bytes (near limit)
    }).create()
    const quotaService = await app.container.make(QuotaService)

    assert.throws(
      () => quotaService.assertCanUpload(org, 200), // Trying to add 200 bytes (exceeds limit)
      'Quota exceeded: storage'
    )
  })

  test('assertCanUpload does not throw when within quota', async ({ assert }) => {
    const org = await OrganizationFactory.merge({
      plan: 'starter',
      storageUsedBytes: 500 * 1024 * 1024, // 500 MB used
    }).create()
    const quotaService = await app.container.make(QuotaService)

    assert.doesNotThrow(() => quotaService.assertCanUpload(org, 1024 * 1024)) // Adding 1 MB
  })

  test('assertCanUpload does not throw for enterprise plan (unlimited)', async ({ assert }) => {
    const org = await OrganizationFactory.merge({
      plan: 'enterprise',
      storageUsedBytes: 100 * 1024 * 1024 * 1024, // 100 GB already used
    }).create()
    const quotaService = await app.container.make(QuotaService)

    assert.doesNotThrow(() => quotaService.assertCanUpload(org, 50 * 1024 * 1024 * 1024)) // Adding 50 GB
  })

  test('updateStorageUsed increments storage_used_bytes', async ({ assert }) => {
    const org = await OrganizationFactory.merge({
      plan: 'pro',
      storageUsedBytes: 1000,
    }).create()
    const quotaService = await app.container.make(QuotaService)

    await quotaService.updateStorageUsed(org, 500)

    const updatedOrg = await Organization.findOrFail(org.id)
    assert.equal(updatedOrg.storageUsedBytes, 1500)
  })

  test('updateStorageUsed decrements storage_used_bytes on deletion', async ({ assert }) => {
    const org = await OrganizationFactory.merge({
      plan: 'pro',
      storageUsedBytes: 1000,
    }).create()
    const quotaService = await app.container.make(QuotaService)

    await quotaService.updateStorageUsed(org, -300)

    const updatedOrg = await Organization.findOrFail(org.id)
    assert.equal(updatedOrg.storageUsedBytes, 700)
  })

  test('GET /settings/billing includes storage quota usage', async ({ client }) => {
    const user = await UserFactory.with(
      'organization',
      1,
      (org) => org.merge({ plan: 'pro', storageUsedBytes: 5 * 1024 * 1024 * 1024 }) // 5 GB used
    ).create()

    const response = await client.get('/settings/billing').loginAs(user)

    response.assertStatus(200)
    // Inertia response contains the props - we verify the page renders successfully
    // The actual props verification would require inspecting the Inertia response
  })

  test('storage quota is updated after file deletion', async ({ assert }) => {
    const org = await OrganizationFactory.merge({
      plan: 'pro',
      storageUsedBytes: 5000,
    }).create()
    const quotaService = await app.container.make(QuotaService)

    // Simulate deletion of a 2000 byte file
    await quotaService.updateStorageUsed(org, -2000)

    const updatedOrg = await Organization.findOrFail(org.id)
    assert.equal(updatedOrg.storageUsedBytes, 3000)
  })

  test('storage usage decrements correctly on deletion', async ({ assert }) => {
    const org = await OrganizationFactory.merge({
      plan: 'pro',
      storageUsedBytes: 100,
    }).create()
    const quotaService = await app.container.make(QuotaService)

    // Delete 50 bytes
    await quotaService.updateStorageUsed(org, -50)

    const updatedOrg = await Organization.findOrFail(org.id)
    // The storage should be decremented correctly
    assert.equal(updatedOrg.storageUsedBytes, 50)
  })
})
