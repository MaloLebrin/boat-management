import { StripeNotConfiguredError } from '#exceptions/billing_errors'
import Organization from '#models/organization'
import type { BillingInterval } from '#shared/types/billing'
import type { PlanModule } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import env from '#start/env'
import Stripe from 'stripe'

@inject()
export default class StripeService {
  private get stripe(): Stripe {
    const key = env.get('STRIPE_SECRET_KEY')
    if (!key) throw new StripeNotConfiguredError()
    return new Stripe(key)
  }

  async getOrCreateCustomer(org: Organization, email: string): Promise<string> {
    if (org.stripeCustomerId) return org.stripeCustomerId

    const customer = await this.stripe.customers.create({
      email,
      metadata: { organizationId: String(org.id) },
    })

    org.stripeCustomerId = customer.id
    await org.save()

    return customer.id
  }

  async createCheckoutSession(opts: {
    customerId: string
    priceIds: string[]
    successUrl: string
    cancelUrl: string
  }): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      customer: opts.customerId,
      line_items: opts.priceIds.map((price) => ({ price, quantity: 1 })),
      mode: 'subscription',
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
    })

    return session.url!
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const portalId = env.get('STRIPE_CUSTOMER_PORTAL_ID')

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      ...(portalId ? { configuration: portalId } : {}),
    })

    return session.url
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    })
  }

  /**
   * Ajoute un item (module add-on) à un abonnement existant (#327). Stripe
   * proratise par défaut ; le webhook `customer.subscription.updated` déclenche
   * ensuite la réconciliation en base.
   *
   * Une **clé d'idempotence** (dérivée de l'abonnement + du prix) garantit que
   * deux requêtes concurrentes — que le garde applicatif `hasModule` ne peut pas
   * intercepter avant l'écriture du webhook — ne créent qu'un seul item facturé
   * (durcissement #332, lot 5c).
   */
  async addSubscriptionItem(subscriptionId: string, priceId: string): Promise<void> {
    await this.stripe.subscriptionItems.create(
      {
        subscription: subscriptionId,
        price: priceId,
        quantity: 1,
      },
      { idempotencyKey: this.moduleIdempotencyKey(subscriptionId, priceId) }
    )
  }

  /** Clé d'idempotence Stripe pour l'ajout d'un item de module (#332, lot 5c). */
  moduleIdempotencyKey(subscriptionId: string, priceId: string): string {
    return `add-module:${subscriptionId}:${priceId}`
  }

  /** Retire un item d'abonnement (module résilié). Le webhook réconcilie ensuite. */
  async removeSubscriptionItem(subscriptionItemId: string): Promise<void> {
    await this.stripe.subscriptionItems.del(subscriptionItemId)
  }

  constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
    const secret = env.get('STRIPE_WEBHOOK_SECRET')
    if (!secret) throw new StripeNotConfiguredError()
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret)
  }

  priceIdFor(planTier: 'pro' | 'enterprise', interval: 'month' | 'year'): string {
    const map: Record<string, string | undefined> = {
      pro_month: env.get('STRIPE_PRO_MONTHLY_PRICE_ID'),
      pro_year: env.get('STRIPE_PRO_ANNUAL_PRICE_ID'),
      enterprise_month: env.get('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID'),
      enterprise_year: env.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID'),
    }

    const priceId = map[`${planTier}_${interval}`]
    if (!priceId) throw new StripeNotConfiguredError()

    return priceId
  }

  /** Prix Stripe d'un module add-on (épic #327) pour un intervalle donné. */
  priceIdForModule(module: PlanModule, interval: BillingInterval): string {
    const map: Record<string, string | undefined> = {
      charter_month: env.get('STRIPE_MODULE_CHARTER_MONTHLY_PRICE_ID'),
      charter_year: env.get('STRIPE_MODULE_CHARTER_ANNUAL_PRICE_ID'),
      crm_invoicing_month: env.get('STRIPE_MODULE_CRM_INVOICING_MONTHLY_PRICE_ID'),
      crm_invoicing_year: env.get('STRIPE_MODULE_CRM_INVOICING_ANNUAL_PRICE_ID'),
    }

    const priceId = map[`${module}_${interval}`]
    if (!priceId) throw new StripeNotConfiguredError()

    return priceId
  }

  /**
   * Module add-on correspondant à un priceId Stripe, ou `null` si le prix est
   * un tier ou un prix inconnu. Utilisé par la sync webhook multi-items pour
   * réconcilier les items d'abonnement vers `organization_modules`.
   */
  moduleForPriceId(priceId: string): PlanModule | null {
    const map: Record<string, PlanModule | undefined> = {
      [env.get('STRIPE_MODULE_CHARTER_MONTHLY_PRICE_ID') ?? '']: 'charter',
      [env.get('STRIPE_MODULE_CHARTER_ANNUAL_PRICE_ID') ?? '']: 'charter',
      [env.get('STRIPE_MODULE_CRM_INVOICING_MONTHLY_PRICE_ID') ?? '']: 'crm_invoicing',
      [env.get('STRIPE_MODULE_CRM_INVOICING_ANNUAL_PRICE_ID') ?? '']: 'crm_invoicing',
    }

    // Un priceId vide/inconnu ne doit jamais matcher la clé '' du fallback.
    if (!priceId) return null
    return map[priceId] ?? null
  }
}
