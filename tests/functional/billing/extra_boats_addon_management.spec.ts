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

test.group('Billing extra_boats add-on management (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the billing page exposes active add-ons with quantity and source', async ({ client }) => {
    const user = await createAdminUser() // Pro
    await new OrganizationModuleService().setAddonQuantity(user.organizationId!, 'extra_boats', 3, {
      source: 'granted',
    })

    const response = await client.get('/settings/billing').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      orgAddons: [{ addon: 'extra_boats', quantity: 3, source: 'granted' }],
    })
    // Le quota bateaux affiché reflète l'add-on : Pro (8) + 3 = 11.
    response.assertInertiaPropsContains({ quotaUsage: { boats: { limit: 11 } } })
  })

  test('setting an add-on is rejected outside the Pro plan', async ({ client }) => {
    const user = await createAdminOnPlan('enterprise')

    const response = await client
      .post('/settings/billing/addon')
      .loginAs(user)
      .form({ addon: 'extra_boats', quantity: 2 })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Add-on modules are only available on the Pro plan.')
  })

  test('setting an add-on without an active subscription is rejected', async ({ client }) => {
    const user = await createAdminUser() // Pro but no subscription row

    const response = await client
      .post('/settings/billing/addon')
      .loginAs(user)
      .form({ addon: 'extra_boats', quantity: 2 })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'No active subscription found.')
  })

  test('setting a positive quantity on a subscribed Pro org reaches Stripe (unconfigured)', async ({
    client,
  }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)

    const response = await client
      .post('/settings/billing/addon')
      .loginAs(user)
      .form({ addon: 'extra_boats', quantity: 5 })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Payment is not configured yet. Please contact support.')
  })

  test('setting quantity 0 when the add-on is not active is a no-op', async ({ client }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)

    const response = await client
      .post('/settings/billing/addon')
      .loginAs(user)
      .form({ addon: 'extra_boats', quantity: 0 })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('info', 'This add-on is not active on your subscription.')
  })

  test('a quantity above the cap is rejected by validation', async ({ client }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)

    const response = await client
      .post('/settings/billing/addon')
      .loginAs(user)
      .form({ addon: 'extra_boats', quantity: 999 })
      .redirects(0)

    response.assertStatus(302)
    // Aucune requête Stripe n'est atteinte : la validation échoue en amont.
  })
})
