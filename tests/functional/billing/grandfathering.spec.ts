import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationModule from '#models/organization_module'
import OrganizationModuleService from '#services/organization_module_service'
import { PLAN_MODULES } from '#shared/types/plan'
import { OrganizationFactory } from '#database/factories/organization_factory'

test.group('Grandfathering — grant modules to Enterprise orgs (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('grants every module as granted to each Enterprise organization', async ({ assert }) => {
    const ent1 = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const ent2 = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    await OrganizationFactory.merge({ plan: 'pro' }).create()
    await OrganizationFactory.merge({ plan: 'starter' }).create()

    const result = await new OrganizationModuleService().grantModulesToEnterpriseOrgs()

    assert.equal(result.organizations, 2)
    assert.equal(result.modulesGranted, 2 * PLAN_MODULES.length)

    for (const org of [ent1, ent2]) {
      const rows = await OrganizationModule.query().where('organizationId', org.id)
      assert.lengthOf(rows, PLAN_MODULES.length)
      assert.isTrue(rows.every((r) => r.source === 'granted'))
    }
  })

  test('does not grant anything to non-Enterprise organizations', async ({ assert }) => {
    const pro = await OrganizationFactory.merge({ plan: 'pro' }).create()

    await new OrganizationModuleService().grantModulesToEnterpriseOrgs()

    const rows = await OrganizationModule.query().where('organizationId', pro.id)
    assert.lengthOf(rows, 0)
  })

  test('is idempotent — a second run grants nothing new and preserves sources', async ({
    assert,
  }) => {
    const ent = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const service = new OrganizationModuleService()

    await service.grantModulesToEnterpriseOrgs()
    const second = await service.grantModulesToEnterpriseOrgs()

    assert.equal(second.modulesGranted, 0)
    const rows = await OrganizationModule.query().where('organizationId', ent.id)
    assert.lengthOf(rows, PLAN_MODULES.length)
  })

  test('does not overwrite an existing subscription module', async ({ assert }) => {
    const ent = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const service = new OrganizationModuleService()
    await service.grantModule(ent.id, 'charter', {
      source: 'subscription',
      stripeSubscriptionItemId: 'si_keep',
    })

    await service.grantModulesToEnterpriseOrgs()

    const charter = await OrganizationModule.query()
      .where('organizationId', ent.id)
      .where('module', 'charter')
      .firstOrFail()
    // The pre-existing subscription row is preserved, not requalified as granted.
    assert.equal(charter.source, 'subscription')
    assert.equal(charter.stripeSubscriptionItemId, 'si_keep')
  })
})
