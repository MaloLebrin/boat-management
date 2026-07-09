import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Subscription from '#models/subscription'
import OrganizationModuleService from '#services/organization_module_service'
import { UserFactory } from '#database/factories/user_factory'
import OrganizationMembership from '#models/organization_membership'
import { createAdminUser } from '#tests/functional/helpers'

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

async function seedActiveSubscription(organizationId: number) {
  await Subscription.create({
    organizationId,
    stripeSubscriptionId: 'sub_active_test',
    stripePriceId: 'price_test_pro_month',
    planTier: 'pro',
    status: 'active',
    billingInterval: 'month',
    currentPeriodStart: DateTime.now(),
    currentPeriodEnd: DateTime.now().plus({ months: 1 }),
    cancelAtPeriodEnd: false,
  })
}

test.group('Billing module management (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the billing page exposes the active modules with their source', async ({ client }) => {
    const user = await createAdminUser() // Pro
    await new OrganizationModuleService().grantModule(user.organizationId!, 'charter', {
      source: 'granted',
    })

    const response = await client.get('/settings/billing').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      activeModules: [{ module: 'charter', source: 'granted' }],
    })
  })

  test('adding a module is rejected outside the Pro plan', async ({ client }) => {
    const user = await createAdminOnPlan('enterprise')

    const response = await client
      .post('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Add-on modules are only available on the Pro plan.')
  })

  test('adding a module without an active subscription is rejected', async ({ client }) => {
    const user = await createAdminUser() // Pro but no subscription row

    const response = await client
      .post('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'No active subscription found.')
  })

  test('adding a module on a subscribed Pro org reaches Stripe (unconfigured in test)', async ({
    client,
  }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)

    // Guard + subscription checks pass; the Stripe call is unconfigured in test.
    const response = await client
      .post('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Payment is not configured yet. Please contact support.')
  })

  test('removing a module that is not active is rejected', async ({ client }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)

    const response = await client
      .delete('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This module is not active on your subscription.')
  })

  test('removing a granted module is rejected (no subscription item to cancel)', async ({
    client,
  }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)
    await new OrganizationModuleService().grantModule(user.organizationId!, 'charter', {
      source: 'granted',
    })

    const response = await client
      .delete('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This module is not active on your subscription.')
  })

  test('removing a subscribed module reaches Stripe (unconfigured in test)', async ({ client }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)
    await new OrganizationModuleService().grantModule(user.organizationId!, 'charter', {
      source: 'subscription',
      stripeSubscriptionItemId: 'si_charter_test',
    })

    const response = await client
      .delete('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Payment is not configured yet. Please contact support.')
  })
})
