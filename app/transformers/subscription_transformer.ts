import type Subscription from '#models/subscription'
import type { SubscriptionDiscountInfo, SubscriptionInfo } from '#shared/types/billing'

/** Remise active de l'abonnement, ou `null` sans coupon (#955). */
export function toSubscriptionDiscountInfo(sub: Subscription): SubscriptionDiscountInfo | null {
  if (!sub.discountCouponId || !sub.discountDuration) return null

  return {
    couponId: sub.discountCouponId,
    promoCode: sub.discountPromoCode,
    name: sub.discountName,
    percentOff: sub.discountPercentOff,
    amountOffCents: sub.discountAmountOffCents,
    currency: sub.discountCurrency,
    duration: sub.discountDuration,
    durationInMonths: sub.discountDurationInMonths,
    end: sub.discountEnd?.toISO() ?? null,
  }
}

export function toSubscriptionInfo(sub: Subscription): SubscriptionInfo {
  return {
    id: sub.id,
    status: sub.status,
    planTier: sub.planTier,
    billingInterval: sub.billingInterval,
    currentPeriodEnd: sub.currentPeriodEnd.toISO()!,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    discount: toSubscriptionDiscountInfo(sub),
  }
}
