import type Subscription from '#models/subscription'
import type { BillingInterval, SubscriptionStatus } from '#shared/types/billing'

export function toSubscriptionInfo(sub: Subscription) {
  return {
    id: sub.id,
    status: sub.status as SubscriptionStatus,
    planTier: sub.planTier,
    billingInterval: sub.billingInterval as BillingInterval,
    currentPeriodEnd: sub.currentPeriodEnd.toISO(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  }
}
