import Organization from '#models/organization'
import Subscription from '#models/subscription'
import type { BillingInterval, SubscriptionInfo, SubscriptionStatus } from '#shared/types/billing'
import type { PlanModule, PlanTier } from '#shared/types/plan'
import StripeService from '#services/stripe_service'
import OrganizationModuleService from '#services/organization_module_service'
import type { DesiredSubscriptionModule } from '#services/organization_module_service'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import OrganizationModuleDeactivated from '#events/organization_module_deactivated'
import { inject } from '@adonisjs/core'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type Stripe from 'stripe'

const PLAN_ORDER: Record<PlanTier, number> = { starter: 0, pro: 1, enterprise: 2 }

@inject()
export default class SubscriptionService {
  constructor(
    private stripeService: StripeService,
    private organizationModuleService: OrganizationModuleService
  ) {}
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

    const stripeSub = await this.stripeService.retrieveSubscription(String(session.subscription))
    const tierItem = this.resolveTierItem(stripeSub)
    const plan = this.planFromPriceId(tierItem.price.id)
    const desiredModules = this.desiredModulesFrom(stripeSub, plan)

    const { downgrade, removed } = await db.transaction(async (trx) => {
      await this.upsertSubscription(org.id, stripeSub, tierItem, trx)
      const reconciled = await this.organizationModuleService.reconcileSubscriptionModules(
        org.id,
        desiredModules,
        trx
      )
      return { downgrade: await this.applyOrgPlan(org, plan, trx), removed: reconciled.removed }
    })

    if (downgrade) {
      await OrganizationPlanDowngraded.dispatch(org, downgrade.fromPlan, plan)
    }
    await this.dispatchModuleDeactivations(org, removed)
  }

  async syncFromSubscriptionEvent(stripeSub: Stripe.Subscription): Promise<void> {
    const org = await Organization.query()
      .where('stripe_customer_id', String(stripeSub.customer))
      .first()

    if (!org) return

    const tierItem = this.resolveTierItem(stripeSub)
    const newPlan =
      stripeSub.status === 'canceled' ? 'starter' : this.planFromPriceId(tierItem.price.id)
    const desiredModules = this.desiredModulesFrom(stripeSub, newPlan)

    const { downgrade, removed } = await db.transaction(async (trx) => {
      await this.upsertSubscription(org.id, stripeSub, tierItem, trx)
      const reconciled = await this.organizationModuleService.reconcileSubscriptionModules(
        org.id,
        desiredModules,
        trx
      )
      return { downgrade: await this.applyOrgPlan(org, newPlan, trx), removed: reconciled.removed }
    })

    if (downgrade) {
      await OrganizationPlanDowngraded.dispatch(org, downgrade.fromPlan, newPlan)
    }
    await this.dispatchModuleDeactivations(org, removed)
  }

  /**
   * Notifie la désactivation des modules retirés de l'abonnement — APRÈS commit
   * (comme `OrganizationPlanDowngraded`), le listener envoyant emails et
   * notifications qui ne doivent jamais s'appuyer sur une transaction annulable.
   */
  private async dispatchModuleDeactivations(
    org: Organization,
    removed: PlanModule[]
  ): Promise<void> {
    for (const module of removed) {
      await OrganizationModuleDeactivated.dispatch(org, module)
    }
  }

  /**
   * Item d'abonnement portant le tier (Pro/Enterprise). Avec le multi-items
   * (#327), il n'est plus forcément à l'index 0. On retient le premier item
   * dont le prix mappe un tier ; à défaut (aucun tier reconnu), le premier item
   * fait foi pour les bornes de période — le plan retombe alors sur `starter`.
   */
  private resolveTierItem(stripeSub: Stripe.Subscription): Stripe.SubscriptionItem {
    const tierItem = stripeSub.items.data.find(
      (item) => this.planFromPriceId(item.price.id) !== 'starter'
    )
    return tierItem ?? stripeSub.items.data[0]
  }

  /**
   * Modules désirés dérivés des items d'add-on de l'abonnement. Un abonnement
   * annulé (`plan = 'starter'`) ne conserve aucun module : la réconciliation
   * retirera alors tous les modules `subscription`.
   */
  private desiredModulesFrom(
    stripeSub: Stripe.Subscription,
    plan: PlanTier
  ): DesiredSubscriptionModule[] {
    if (plan === 'starter') return []

    const desired: DesiredSubscriptionModule[] = []
    for (const item of stripeSub.items.data) {
      const module = this.stripeService.moduleForPriceId(item.price.id)
      if (module) desired.push({ module, stripeSubscriptionItemId: item.id })
    }
    return desired
  }

  private async upsertSubscription(
    organizationId: number,
    stripeSub: Stripe.Subscription,
    tierItem: Stripe.SubscriptionItem,
    trx: TransactionClientContract
  ) {
    const priceId = tierItem.price.id
    const { start, end } = this.getPeriodBounds(tierItem)

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
      },
      { client: trx }
    )
  }

  private getPeriodBounds(item: Stripe.SubscriptionItem): { start: DateTime; end: DateTime } {
    // Stripe's current_period bounds are authoritative: they already account for
    // trials, pauses and mid-cycle adjustments, which a recomputation from
    // `billing_cycle_anchor` would get wrong. In the API version shipped with this
    // SDK these fields live on the subscription item (the tier item), not the
    // subscription itself.
    return {
      start: DateTime.fromSeconds(item.current_period_start),
      end: DateTime.fromSeconds(item.current_period_end),
    }
  }

  /**
   * Applies the plan change to the organization within the given transaction.
   * Returns `{ fromPlan }` when the change is a downgrade so the caller can
   * dispatch OrganizationPlanDowngraded AFTER the transaction commits — the
   * listener sends emails and writes notifications, so it must never act on a
   * change that could still roll back. Returns null when there is no downgrade.
   */
  private async applyOrgPlan(
    org: Organization,
    plan: PlanTier,
    trx: TransactionClientContract
  ): Promise<{ fromPlan: PlanTier } | null> {
    if (org.plan === plan) return null

    const isDowngrade = PLAN_ORDER[plan] < PLAN_ORDER[org.plan]
    const fromPlan = org.plan
    org.plan = plan
    await org.useTransaction(trx).save()

    return isDowngrade ? { fromPlan } : null
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
