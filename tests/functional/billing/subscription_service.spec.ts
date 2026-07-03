import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Subscription from '#models/subscription'
import SubscriptionService from '#services/subscription_service'
import { OrganizationFactory } from '#database/factories/organization_factory'

/**
 * Minimal Stripe.Subscription shape needed by syncFromSubscriptionEvent.
 * The period bounds live on the subscription item (current API version).
 */
function fakeStripeSubscription(
  customerId: string,
  opts: { anchor: number; periodStart: number; periodEnd: number }
) {
  return {
    id: 'sub_test_123',
    customer: customerId,
    status: 'active',
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

    const service = new SubscriptionService({} as any)
    await service.syncFromSubscriptionEvent(
      fakeStripeSubscription('cus_period_test', { anchor, periodStart, periodEnd }) as any
    )

    const sub = await Subscription.query().where('organizationId', org.id).firstOrFail()
    assert.equal(sub.currentPeriodStart.toUTC().toISODate(), '2030-01-10')
    assert.equal(sub.currentPeriodEnd.toUTC().toISODate(), '2030-02-10')
  })
})
