import { test } from '@japa/runner'
import type Stripe from 'stripe'
import { truncateDb } from '#tests/utils/db'
import emitter from '@adonisjs/core/services/emitter'
import Subscription from '#models/subscription'
import SubscriptionService from '#services/subscription_service'
import OrganizationModuleService from '#services/organization_module_service'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { stripeSubscription } from '#tests/support/stripe'

/**
 * Le prix par défaut de `stripeSubscription` ne mappe aucun tier : le plan
 * retombe sur `starter`, ce qui isole les bornes de période du plan.
 */
function fakeStripeSubscription(
  customerId: string,
  opts: { status?: Stripe.Subscription.Status } = {}
) {
  return stripeSubscription({
    id: 'sub_test_123',
    customer: customerId,
    ...(opts.status ? { status: opts.status } : {}),
  })
}

test.group('SubscriptionService period bounds (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('upsert stores Stripe item current_period bounds verbatim, not a recomputed anchor loop', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_period_test' }).create()

    // Les défauts partagés (`tests/support/stripe.ts`) posent un anchor loin dans
    // le passé (2020) et une période annoncée par Stripe en 2030. L'ancienne
    // logique de boucle sur l'anchor aurait avancé la période jusqu'à encadrer
    // "maintenant" : asserter les bornes 2030 prouve qu'on lit Stripe verbatim.
    const service = new SubscriptionService({} as any, new OrganizationModuleService())
    await service.syncFromSubscriptionEvent(fakeStripeSubscription('cus_period_test'))

    const sub = await Subscription.query().where('organizationId', org.id).firstOrFail()
    assert.equal(sub.currentPeriodStart.toUTC().toISODate(), '2030-01-10')
    assert.equal(sub.currentPeriodEnd.toUTC().toISODate(), '2030-02-10')
  })
})

test.group('SubscriptionService sync atomicity (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('subscription upsert and org plan update commit together, event dispatched after commit', async ({
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await OrganizationFactory.merge({
      stripeCustomerId: 'cus_downgrade',
      plan: 'enterprise',
    }).create()

    const service = new SubscriptionService({} as any, new OrganizationModuleService())
    await service.syncFromSubscriptionEvent(
      fakeStripeSubscription('cus_downgrade', { status: 'canceled' })
    )

    // Both writes committed: org plan downgraded to starter AND subscription row saved.
    await org.refresh()
    assert.equal(org.plan, 'starter')
    const sub = await Subscription.query().where('organizationId', org.id).firstOrFail()
    assert.equal(sub.status, 'canceled')

    // The downgrade event is dispatched once, after the transaction commits.
    events.assertEmitted(OrganizationPlanDowngraded)
  })

  test('rolls back the subscription upsert when the plan update fails', async ({
    assert,
    cleanup,
  }) => {
    const events = emitter.fake()
    cleanup(() => emitter.restore())

    const org = await OrganizationFactory.merge({
      stripeCustomerId: 'cus_rollback',
      plan: 'enterprise',
    }).create()

    const service = new SubscriptionService({} as any, new OrganizationModuleService())
    // Force the second write (plan update) to fail after the subscription upsert
    // has already run inside the transaction.
    ;(service as any).applyOrgPlan = async () => {
      throw new Error('plan update failed')
    }

    await assert.rejects(() =>
      service.syncFromSubscriptionEvent(
        fakeStripeSubscription('cus_rollback', { status: 'canceled' })
      )
    )

    // The subscription upsert is rolled back with the failed plan update…
    const sub = await Subscription.query().where('organizationId', org.id).first()
    assert.isNull(sub)

    // …and the org plan is left untouched. No event is dispatched.
    await org.refresh()
    assert.equal(org.plan, 'enterprise')
    events.assertNoneEmitted()
  })
})
