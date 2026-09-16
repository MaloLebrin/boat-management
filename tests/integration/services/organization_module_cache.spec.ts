import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import Organization from '#models/organization'
import OrganizationModuleService from '#services/organization_module_service'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { countQueries } from '#tests/utils/query_counter'

const MODULES = 'organization_modules'

test.group('OrganizationModuleService per-instance cache (integration)', () => {
  test('effective quotas are computed from a single read for the same organization instance', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const service = await app.container.make(OrganizationModuleService)

    const queries = await countQueries(
      async () => {
        await service.getEffectiveQuotas(org)
        await service.getEffectiveQuotas(org)
        await service.sharedProps(org)
      },
      { table: MODULES }
    )

    assert.equal(queries, 1)
  })

  test('sharedProps returns active modules and addons in module order', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const service = await app.container.make(OrganizationModuleService)
    await service.grantModule(org.id, 'charter')
    await service.grantModule(org.id, 'crm_invoicing')
    await service.setAddonQuantity(org.id, 'extra_boats', 3)

    const props = await service.sharedProps(org)

    assert.deepEqual(props.activeModules, await service.getActiveModules(org.id))
    assert.deepEqual(props.activeAddons, await service.getActiveAddons(org.id))
    assert.deepEqual(props.activeModules, ['charter', 'crm_invoicing'])
    assert.deepEqual(props.activeAddons, [{ addon: 'extra_boats', quantity: 3, source: 'granted' }])
  })

  test('two instances of the same organization do not share a cache', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const again = await Organization.findOrFail(org.id)
    const service = await app.container.make(OrganizationModuleService)
    await service.getEffectiveQuotas(org)

    const queries = await countQueries(() => service.getEffectiveQuotas(again), { table: MODULES })

    assert.equal(queries, 1)
  })

  test('granting a module invalidates the cache', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const service = await app.container.make(OrganizationModuleService)
    const before = await service.getEffectiveQuotas(org)
    assert.isFalse(before.canManageClients)

    await service.grantModule(org.id, 'crm_invoicing')

    const after = await service.getEffectiveQuotas(org)
    assert.isTrue(after.canManageClients)
  })

  test('revoking a module (bulk delete) invalidates the cache', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const service = await app.container.make(OrganizationModuleService)
    await service.grantModule(org.id, 'crm_invoicing', { source: 'subscription' })
    const granted = await service.getEffectiveQuotas(org)
    assert.isTrue(granted.canManageClients)

    await service.revokeModule(org.id, 'crm_invoicing')

    const revoked = await service.getEffectiveQuotas(org)
    assert.isFalse(revoked.canManageClients)
  })

  test('changing an addon quantity invalidates the cache', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const service = await app.container.make(OrganizationModuleService)
    const base = await service.getEffectiveQuotas(org)

    await service.setAddonQuantity(org.id, 'extra_boats', 2)
    const raised = await service.getEffectiveQuotas(org)
    assert.equal(raised.maxBoats, base.maxBoats! + 2)

    await service.setAddonQuantity(org.id, 'extra_boats', 0)
    const reset = await service.getEffectiveQuotas(org)
    assert.equal(reset.maxBoats, base.maxBoats)
  })
})
