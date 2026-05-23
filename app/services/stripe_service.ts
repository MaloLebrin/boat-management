import { StripeNotConfiguredError } from '#exceptions/billing_errors'
import Organization from '#models/organization'
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
    priceId: string
    successUrl: string
    cancelUrl: string
  }): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      customer: opts.customerId,
      line_items: [{ price: opts.priceId, quantity: 1 }],
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
}
