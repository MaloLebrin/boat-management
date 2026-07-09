import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationModule from '#models/organization_module'
import OrganizationModuleService from '#services/organization_module_service'
import { OrganizationFactory } from '#database/factories/organization_factory'

test.group('OrganizationModuleService', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an organization has no active module by default', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const service = new OrganizationModuleService()

    assert.deepEqual(await service.getActiveModules(org.id), [])
    assert.isFalse(await service.hasModule(org.id, 'charter'))
  })

  test('grantModule activates the module for the organization only', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const service = new OrganizationModuleService()

    await service.grantModule(org.id, 'charter')

    assert.isTrue(await service.hasModule(org.id, 'charter'))
    assert.isFalse(await service.hasModule(org.id, 'crm_invoicing'))
    assert.isFalse(await service.hasModule(otherOrg.id, 'charter'))
    assert.deepEqual(await service.getActiveModules(org.id), ['charter'])
  })

  test('grantModule is idempotent and preserves the original source', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const service = new OrganizationModuleService()

    await service.grantModule(org.id, 'crm_invoicing', { source: 'granted' })
    await service.grantModule(org.id, 'crm_invoicing', {
      source: 'subscription',
      stripeSubscriptionItemId: 'si_test_123',
    })

    const rows = await OrganizationModule.query()
      .where('organizationId', org.id)
      .where('module', 'crm_invoicing')
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].source, 'granted')
    assert.isNull(rows[0].stripeSubscriptionItemId)
  })

  test('the (organization, module) pair is unique at the database level', async ({ assert }) => {
    const org = await OrganizationFactory.create()

    await OrganizationModule.create({ organizationId: org.id, module: 'charter' })

    await assert.rejects(async () => {
      await OrganizationModule.create({ organizationId: org.id, module: 'charter' })
    })
  })

  test('revokeModule removes a subscription module by default', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const service = new OrganizationModuleService()

    await service.grantModule(org.id, 'charter', {
      source: 'subscription',
      stripeSubscriptionItemId: 'si_test_456',
    })
    await service.revokeModule(org.id, 'charter')

    assert.isFalse(await service.hasModule(org.id, 'charter'))
  })

  test('revokeModule never removes a granted module unless explicitly asked', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const service = new OrganizationModuleService()

    await service.grantModule(org.id, 'charter', { source: 'granted' })

    // La sync Stripe (retrait d'un item d'abonnement) ne doit pas toucher un module offert
    await service.revokeModule(org.id, 'charter')
    assert.isTrue(await service.hasModule(org.id, 'charter'))

    await service.revokeModule(org.id, 'charter', { source: 'granted' })
    assert.isFalse(await service.hasModule(org.id, 'charter'))
  })

  test('modules are deleted in cascade with their organization', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const service = new OrganizationModuleService()
    await service.grantModule(org.id, 'charter')

    await org.delete()

    const rows = await OrganizationModule.query().where('organizationId', org.id)
    assert.lengthOf(rows, 0)
  })
})
