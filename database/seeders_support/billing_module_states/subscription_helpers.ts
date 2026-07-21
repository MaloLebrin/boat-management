import Subscription from '#models/subscription'
import type { PlanTier } from '#shared/types/plan'
import type { SubscriptionStatus } from '#shared/types/billing'
import { DateTime } from 'luxon'

/** Creates/updates the org's Stripe subscription row (idempotent by organizationId). */
export async function ensureSubscription(
  orgId: number,
  planTier: PlanTier,
  status: SubscriptionStatus
): Promise<void> {
  await Subscription.updateOrCreate(
    { organizationId: orgId },
    {
      stripeSubscriptionId: `sub_test_${orgId}`,
      stripePriceId: `price_test_${planTier}_month`,
      planTier,
      status,
      billingInterval: 'month',
      currentPeriodStart: DateTime.now(),
      currentPeriodEnd: DateTime.now().plus({ months: 1 }),
      cancelAtPeriodEnd: false,
    }
  )
}
