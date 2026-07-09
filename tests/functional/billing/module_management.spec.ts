import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import Stripe from 'stripe'
import { DateTime } from 'luxon'
import Subscription from '#models/subscription'
import OrganizationModuleService from '#services/organization_module_service'
import StripeService from '#services/stripe_service'
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
    // Prop de page : objets {module, source}, nommée `orgModules`…
    response.assertInertiaPropsContains({
      orgModules: [{ module: 'charter', source: 'granted' }],
    })
    // …et la prop partagée `activeModules` (chaînes, pour la nav) n'est PAS écrasée.
    response.assertInertiaPropsContains({ activeModules: ['charter'] })
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

  test('adding an already-active module is a no-op (idempotency guard)', async ({ client }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)
    await new OrganizationModuleService().grantModule(user.organizationId!, 'charter', {
      source: 'subscription',
      stripeSubscriptionItemId: 'si_charter_existing',
    })

    // Must short-circuit BEFORE the Stripe call: no second subscription item is
    // created (which would otherwise be billed with no way to cancel it).
    const response = await client
      .post('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('info', 'This module is already active on your subscription.')
  })

  test('the idempotency guard also blocks re-adding a granted module', async ({ client }) => {
    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)
    await new OrganizationModuleService().grantModule(user.organizationId!, 'crm_invoicing', {
      source: 'granted',
    })

    const response = await client
      .post('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'crm_invoicing' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('info', 'This module is already active on your subscription.')
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

  test('a Stripe error while removing a module is surfaced as a flash, not a 500', async ({
    client,
    cleanup,
  }) => {
    // Une requête concurrente peut retirer l'item avant la réconciliation du
    // webhook ; le second `del` lève un `resource_missing` côté Stripe. Sans
    // gestion, ce serait un 500 non géré (asymétrie avec l'ajout idempotent).
    app.container.swap(
      StripeService,
      () =>
        ({
          removeSubscriptionItem: async () => {
            throw Stripe.errors.StripeError.generate({
              type: 'invalid_request_error',
              code: 'resource_missing',
              message: 'No such subscription item',
            } as never)
          },
        }) as unknown as StripeService
    )
    cleanup(() => app.container.restore(StripeService))

    const user = await createAdminUser()
    await seedActiveSubscription(user.organizationId!)
    await new OrganizationModuleService().grantModule(user.organizationId!, 'charter', {
      source: 'subscription',
      stripeSubscriptionItemId: 'si_charter_gone',
    })

    const response = await client
      .delete('/settings/billing/module')
      .loginAs(user)
      .form({ module: 'charter' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'The module could not be updated. Please try again.')
  })
})
