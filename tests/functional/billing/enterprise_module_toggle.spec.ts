import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationModuleService from '#services/organization_module_service'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'

/**
 * Toggle self-service des modules `granted` sur le plan Enterprise (#353) :
 * aucune interaction Stripe, réservé aux admins, ne touche jamais les modules
 * `source: 'subscription'` (Pro).
 */
async function createAdminOnPlan(plan: 'starter' | 'pro' | 'enterprise') {
  const user = await UserFactory.with('organization', 1, (org) => org.merge({ plan })).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

test.group('Enterprise module toggle (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an Enterprise admin can deactivate a granted module', async ({ client }) => {
    const user = await createAdminOnPlan('enterprise')
    await new OrganizationModuleService().grantModule(user.organizationId!, 'charter', {
      source: 'granted',
    })

    const response = await client
      .delete('/settings/billing/module/enterprise')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Module deactivated.')
    const stillGranted = await new OrganizationModuleService().hasModule(
      user.organizationId!,
      'charter'
    )
    if (stillGranted) throw new Error('expected the granted module row to be removed')
  })

  test('an Enterprise admin can reactivate a module', async ({ client }) => {
    const user = await createAdminOnPlan('enterprise')

    const response = await client
      .post('/settings/billing/module/enterprise')
      .loginAs(user)
      .form({ module: 'crm_invoicing' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Module activated.')
    const service = new OrganizationModuleService()
    const rows = await service.listWithSource(user.organizationId!)
    const row = rows.find((r) => r.module === 'crm_invoicing')
    if (row?.source !== 'granted') {
      throw new Error('expected crm_invoicing to be granted after reactivation')
    }
  })

  test('a non-admin member cannot toggle a module', async ({ client }) => {
    const admin = await createAdminOnPlan('enterprise')
    const member = await createMemberUser(admin.organizationId!)
    await new OrganizationModuleService().grantModule(admin.organizationId!, 'charter', {
      source: 'granted',
    })

    const response = await client
      .delete('/settings/billing/module/enterprise')
      .loginAs(member)
      .form({ module: 'charter' })
      .header('Accept', 'application/json')
      .redirects(0)

    response.assertStatus(403)
  })

  test('a Pro org hitting the enterprise toggle route is rejected', async ({ client }) => {
    const user = await createAdminUser() // Pro

    const response = await client
      .post('/settings/billing/module/enterprise')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This action is only available on the Enterprise plan.')
  })

  test('deactivating never touches a subscription-sourced module row', async ({ client }) => {
    const user = await createAdminOnPlan('enterprise')
    await new OrganizationModuleService().grantModule(user.organizationId!, 'charter', {
      source: 'subscription',
      stripeSubscriptionItemId: 'si_charter_regression',
    })

    const response = await client
      .delete('/settings/billing/module/enterprise')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    const service = new OrganizationModuleService()
    const rows = await service.listWithSource(user.organizationId!)
    const row = rows.find((r) => r.module === 'charter')
    if (row?.source !== 'subscription') {
      throw new Error('expected the subscription-sourced row to survive the enterprise toggle')
    }
  })
})
