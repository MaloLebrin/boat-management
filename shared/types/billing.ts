import type { PlanTier } from './plan.js'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'

export type BillingInterval = 'month' | 'year'

export interface SubscriptionInfo {
  id: number
  status: SubscriptionStatus
  planTier: PlanTier
  billingInterval: BillingInterval
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export interface CheckoutPayload {
  planTier: 'pro' | 'enterprise'
  interval: BillingInterval
}
