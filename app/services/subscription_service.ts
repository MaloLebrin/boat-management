import Organization from '#models/organization'
import Subscription from '#models/subscription'
import type { BillingInterval, SubscriptionInfo, SubscriptionStatus } from '#shared/types/billing'
import type { PlanTier } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import env from '#start/env'
import { DateTime } from 'luxon'
import type Stripe from 'stripe'

@inject()
export default class SubscriptionService {
  async getActive(organizationId: number): Promise<Subscription | null> {
    return Subscription.query()
      .where('organizationId', organizationId)
      .whereIn('status', ['active', 'trialing', 'past_due'])
      .first()
  }

  toInfo(sub: Subscription): SubscriptionInfo {
    return {
      id: sub.id,
      status: sub.status,
      planTier: sub.planTier,
      billingInterval: sub.billingInterval,
      currentPeriodEnd: sub.currentPeriodEnd.toISO()!,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    }
  }

  async syncFromCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
    if (!session.subscription || !session.customer) return

    const org = await Organization.query()
      .where('stripe_customer_id', String(session.customer))
      .first()

    if (!org) return

    const stripeSub = session.subscription as Stripe.Subscription
    await this.upsertSubscription(org.id, stripeSub)
    await this.updateOrgPlan(org, this.planFromPriceId(stripeSub.items.data[0].price.id))
  }

  async syncFromSubscriptionEvent(stripeSub: Stripe.Subscription): Promise<void> {
    const org = await Organization.query()
      .where('stripe_customer_id', String(stripeSub.customer))
      .first()

    if (!org) return

    await this.upsertSubscription(org.id, stripeSub)

    const newPlan =
      stripeSub.status === 'canceled'
        ? 'starter'
        : this.planFromPriceId(stripeSub.items.data[0].price.id)

    await this.updateOrgPlan(org, newPlan)
  }

  private async upsertSubscription(organizationId: number, stripeSub: Stripe.Subscription) {
    const priceId = stripeSub.items.data[0].price.id
    const { start, end } = this.getPeriodBounds(stripeSub)

    await Subscription.updateOrCreate(
      { organizationId },
      {
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        planTier: this.planFromPriceId(priceId),
        status: stripeSub.status as SubscriptionStatus,
        billingInterval: this.intervalFromPriceId(priceId),
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      }
    )
  }

  private getPeriodBounds(stripeSub: Stripe.Subscription): { start: DateTime; end: DateTime } {
    const anchor = DateTime.fromSeconds(stripeSub.billing_cycle_anchor)
    const item = stripeSub.items.data[0]
    const interval = item.price.recurring?.interval ?? 'month'
    const count = item.price.recurring?.interval_count ?? 1
    const now = DateTime.now()

    const addInterval = (dt: DateTime): DateTime =>
      interval === 'year' ? dt.plus({ years: count }) : dt.plus({ months: count })

    let periodStart = anchor
    let periodEnd = addInterval(anchor)

    while (periodEnd < now) {
      periodStart = periodEnd
      periodEnd = addInterval(periodEnd)
    }

    return { start: periodStart, end: periodEnd }
  }

  private async updateOrgPlan(org: Organization, plan: PlanTier) {
    if (org.plan !== plan) {
      org.plan = plan
      await org.save()
    }
  }

  private planFromPriceId(priceId: string): PlanTier {
    const map: Record<string, PlanTier> = {
      [env.get('STRIPE_PRO_MONTHLY_PRICE_ID') ?? '']: 'pro',
      [env.get('STRIPE_PRO_ANNUAL_PRICE_ID') ?? '']: 'pro',
      [env.get('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID') ?? '']: 'enterprise',
      [env.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID') ?? '']: 'enterprise',
    }

    return map[priceId] ?? 'starter'
  }

  private intervalFromPriceId(priceId: string): BillingInterval {
    const annualIds = [
      env.get('STRIPE_PRO_ANNUAL_PRICE_ID'),
      env.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID'),
    ]

    return annualIds.includes(priceId) ? 'year' : 'month'
  }
}
