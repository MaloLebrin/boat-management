import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import emitter from '@adonisjs/core/services/emitter'
import Subscription from '#models/subscription'
import SubscriptionService from '#services/subscription_service'
import OrganizationModuleService from '#services/organization_module_service'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import { OrganizationFactory } from '#database/factories/organization_factory'

/**
 * Minimal Stripe.Subscription shape needed by syncFromSubscriptionEvent.
 * The period bounds live on the subscription item (current API version).
 */
function fakeStripeSubscription(
  customerId: string,
  opts: { anchor: number; periodStart: number; periodEnd: number; status?: string }
) {
  return {
    id: 'sub_test_123',
    customer: customerId,
    status: opts.status ?? 'active',
    cancel_at_period_end: false,
    billing_cycle_anchor: opts.anchor,
    items: {
      data: [
        {
          price: { id: 'price_unmapped', recurring: { interval: 'month', interval_count: 1 } },
          current_period_start: opts.periodStart,
          current_period_end: opts.periodEnd,
        },
      ],
    },
  }
}

const PERIOD = {
  anchor: Math.floor(Date.UTC(2020, 0, 1) / 1000),
  periodStart: Math.floor(Date.UTC(2030, 0, 10) / 1000),
  periodEnd: Math.floor(Date.UTC(2030, 1, 10) / 1000),
}

test.group('SubscriptionService period bounds (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('upsert stores Stripe item current_period bounds verbatim, not a recomputed anchor loop', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.merge({ stripeCustomerId: 'cus_period_test' }).create()

    // Anchor is far in the past (2020) while Stripe reports a 2030 period. The old
    // anchor-loop logic would have advanced the period to land near "now", so
    // asserting the stored period equals the 2030 item bounds proves Stripe's
    // authoritative values are used verbatim.
    const periodStart = Math.floor(Date.UTC(2030, 0, 10) / 1000)
    const periodEnd = Math.floor(Date.UTC(2030, 1, 10) / 1000)
    const anchor = Math.floor(Date.UTC(2020, 0, 1) / 1000)

    const service = new SubscriptionService({} as any, new OrganizationModuleService())
    await service.syncFromSubscriptionEvent(
      fakeStripeSubscription('cus_period_test', { anchor, periodStart, periodEnd }) as any
    )

    const sub = await Subscription.query().where('organizationId', org.id).firstOrFail()
    assert.equal(sub.currentPeriodStart.toUTC().toISODate(), '2030-01-10')
    assert.equal(sub.currentPeriodEnd.toUTC().toISODate(), '2030-02-10')
  })
})

test.group('SubscriptionService sync atomicity (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

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
      fakeStripeSubscription('cus_downgrade', { ...PERIOD, status: 'canceled' }) as any
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
        fakeStripeSubscription('cus_rollback', { ...PERIOD, status: 'canceled' }) as any
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
