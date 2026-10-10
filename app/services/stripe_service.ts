import { StripeNotConfiguredError } from '#exceptions/billing_errors'
import Organization from '#models/organization'
import type { BillingInterval } from '#shared/types/billing'
import type { PlanAddon, PlanModule } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import env from '#start/env'
import Stripe from 'stripe'

@inject()
export default class StripeService {
  private get stripe(): Stripe {
    // `?.release()` avant le test de présence : la variable est vide en test
    // (`.env.test`), et un `Secret('')` serait truthy.
    const key = env.get('STRIPE_SECRET_KEY')?.release()
    if (!key) throw new StripeNotConfiguredError()
    return new Stripe(key)
  }

  /** Vrai si la clé API est posée : sans elle, aucun appel Stripe n'aboutit. */
  isConfigured(): boolean {
    return Boolean(env.get('STRIPE_SECRET_KEY')?.release())
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

  /**
   * Session Checkout d'abonnement. Avec `promotionCodeId`, la remise est
   * pré-appliquée via `discounts` (#955) ; Stripe refuse de le combiner avec
   * `allow_promotion_codes`, qu'on ne pose donc jamais — le code est saisi et
   * vérifié dans l'app, pas sur la page Stripe.
   */
  async createCheckoutSession(opts: {
    customerId: string
    priceIds: string[]
    successUrl: string
    cancelUrl: string
    promotionCodeId?: string
  }): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      customer: opts.customerId,
      line_items: opts.priceIds.map((price) => ({ price, quantity: 1 })),
      mode: 'subscription',
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      ...(opts.promotionCodeId ? { discounts: [{ promotion_code: opts.promotionCodeId }] } : {}),
    })

    return session.url!
  }

  /**
   * Le code promo **actif** portant ce code, coupon développé, ou `null` (#955).
   * Stripe compare les codes sans tenir compte de la casse : la saisie est
   * transmise telle quelle et `promo.code` rend la graphie canonique.
   */
  async findPromotionCode(code: string): Promise<Stripe.PromotionCode | null> {
    const { data } = await this.stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ['data.promotion.coupon'],
    })
    return data[0] ?? null
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
      // `discounts` arrive en identifiants nus, et le coupon comme le code promo
      // d'une remise ne sont lus que développés (#955).
      expand: ['items.data.price', 'discounts.source.coupon', 'discounts.promotion_code'],
    })
  }

  /**
   * Programme (ou déprogramme) la fin d'un abonnement à l'échéance (#886) :
   * posé à la demande de suppression d'une organisation, levé si elle est
   * annulée pendant la période de grâce. Le webhook synchronise la base.
   */
  async setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancel })
  }

  /** Résiliation immédiate (#886) : purge définitive d'une organisation. */
  async cancelSubscriptionNow(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId)
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
  async addSubscriptionItem(
    subscriptionId: string,
    priceId: string,
    quantity: number = 1
  ): Promise<void> {
    await this.stripe.subscriptionItems.create(
      {
        subscription: subscriptionId,
        price: priceId,
        quantity,
      },
      { idempotencyKey: this.moduleIdempotencyKey(subscriptionId, priceId) }
    )
  }

  /**
   * Met à jour la quantité d'un item d'abonnement existant (add-on quantitatif,
   * #333). Stripe proratise ; le webhook `customer.subscription.updated`
   * réconcilie ensuite la quantité en base.
   */
  async updateSubscriptionItemQuantity(
    subscriptionItemId: string,
    quantity: number
  ): Promise<void> {
    await this.stripe.subscriptionItems.update(subscriptionItemId, { quantity })
  }

  /** Clé d'idempotence Stripe pour l'ajout d'un item de module (#332, lot 5c). */
  moduleIdempotencyKey(subscriptionId: string, priceId: string): string {
    return `add-module:${subscriptionId}:${priceId}`
  }

  /** Retire un item d'abonnement (module résilié). Le webhook réconcilie ensuite. */
  async removeSubscriptionItem(subscriptionItemId: string): Promise<void> {
    await this.stripe.subscriptionItems.del(subscriptionItemId)
  }

  /**
   * Lit un prix du catalogue Stripe. Utilisé par `pricing:check` (#612) pour
   * confronter les montants réellement facturés au barème du code.
   */
  async retrievePrice(priceId: string): Promise<Stripe.Price> {
    return this.stripe.prices.retrieve(priceId)
  }

  // ── Stripe Connect : encaissement pour le compte de l'organisation (#876) ──

  /**
   * Crée le compte connecté **Standard** de l'organisation : le loueur possède
   * son compte Stripe, reçoit les fonds directement et gère lui-même
   * remboursements et litiges depuis son tableau de bord.
   */
  async createConnectedAccount(org: Organization, email: string): Promise<string> {
    const account = await this.stripe.accounts.create(
      {
        type: 'standard',
        email,
        metadata: { organizationId: String(org.id) },
      },
      // Un double clic sur « Connecter » ne crée qu'un compte.
      { idempotencyKey: `connect-account:${org.id}` }
    )
    return account.id
  }

  /** Lien d'onboarding hébergé par Stripe (à usage unique, expire en quelques minutes). */
  async createAccountLink(opts: {
    accountId: string
    refreshUrl: string
    returnUrl: string
  }): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: opts.accountId,
      refresh_url: opts.refreshUrl,
      return_url: opts.returnUrl,
      type: 'account_onboarding',
    })
    return link.url
  }

  async retrieveAccount(accountId: string): Promise<Stripe.Account> {
    return this.stripe.accounts.retrieve(accountId)
  }

  /**
   * Session Checkout de paiement d'une facture, créée **sur le compte
   * connecté** (charge directe) : l'argent ne transite pas par FleetAi.
   * Les métadonnées sont posées sur la session et sur le PaymentIntent, pour
   * que le webhook retrouve la facture quel que soit l'événement lu.
   */
  async createInvoiceCheckoutSession(opts: {
    accountId: string
    amountCents: number
    currency: string
    productName: string
    customerEmail: string | null
    successUrl: string
    cancelUrl: string
    metadata: Record<string, string>
  }): Promise<{ id: string; url: string }> {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: opts.currency.toLowerCase(),
              unit_amount: opts.amountCents,
              product_data: { name: opts.productName },
            },
          },
        ],
        ...(opts.customerEmail ? { customer_email: opts.customerEmail } : {}),
        success_url: opts.successUrl,
        cancel_url: opts.cancelUrl,
        metadata: opts.metadata,
        payment_intent_data: { metadata: opts.metadata },
      },
      { stripeAccount: opts.accountId }
    )

    return { id: session.id, url: session.url! }
  }

  /**
   * Vérifie un événement de l'endpoint « comptes connectés ». Stripe signe
   * cet endpoint avec son propre secret : il ne se confond pas avec celui des
   * abonnements.
   */
  constructConnectWebhookEvent(rawBody: string, signature: string): Stripe.Event {
    const secret = env.get('STRIPE_CONNECT_WEBHOOK_SECRET')?.release()
    if (!secret) throw new StripeNotConfiguredError()
    return Stripe.webhooks.constructEvent(rawBody, signature, secret)
  }

  constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
    const secret = env.get('STRIPE_WEBHOOK_SECRET')?.release()
    if (!secret) throw new StripeNotConfiguredError()
    // Vérification purement cryptographique (HMAC SHA-256 sur le corps brut) :
    // aucun appel réseau, donc aucun besoin de la clé API. Passer par
    // `this.stripe` liait le rejet d'une signature à la présence de
    // STRIPE_SECRET_KEY — sans elle, l'endpoint répondait 400 à *tous* les
    // événements et Stripe retentait indéfiniment (#698).
    return Stripe.webhooks.constructEvent(rawBody, signature, secret)
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

  /** Prix Stripe d'un add-on quantitatif (épic #333) pour un intervalle donné. */
  priceIdForAddon(addon: PlanAddon, interval: BillingInterval): string {
    const map: Record<string, string | undefined> = {
      extra_boats_month: env.get('STRIPE_ADDON_EXTRA_BOATS_MONTHLY_PRICE_ID'),
      extra_boats_year: env.get('STRIPE_ADDON_EXTRA_BOATS_ANNUAL_PRICE_ID'),
    }

    const priceId = map[`${addon}_${interval}`]
    if (!priceId) throw new StripeNotConfiguredError()

    return priceId
  }

  /**
   * Add-on quantitatif correspondant à un priceId Stripe, ou `null` si le prix
   * est un tier, un module ou un prix inconnu. Utilisé par la sync webhook
   * multi-items pour réconcilier les items d'abonnement vers `organization_modules`.
   */
  addonForPriceId(priceId: string): PlanAddon | null {
    const map: Record<string, PlanAddon | undefined> = {
      [env.get('STRIPE_ADDON_EXTRA_BOATS_MONTHLY_PRICE_ID') ?? '']: 'extra_boats',
      [env.get('STRIPE_ADDON_EXTRA_BOATS_ANNUAL_PRICE_ID') ?? '']: 'extra_boats',
    }

    if (!priceId) return null
    return map[priceId] ?? null
  }
}
