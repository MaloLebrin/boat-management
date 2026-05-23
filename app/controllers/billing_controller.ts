import { StripeNotConfiguredError } from '#exceptions/billing_errors'
import StripeService from '#services/stripe_service'
import SubscriptionService from '#services/subscription_service'
import { checkoutValidator } from '#validators/billing'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import type Stripe from 'stripe'

@inject()
export default class BillingController {
  constructor(
    private stripeService: StripeService,
    private subscriptionService: SubscriptionService
  ) {}

  async checkout({ request, inertia, auth, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await user.load('organization')

      const { planTier, interval } = await request.validateUsing(checkoutValidator)
      const priceId = this.stripeService.priceIdFor(planTier, interval)
      const customerId = await this.stripeService.getOrCreateCustomer(user.organization, user.email)

      const url = await this.stripeService.createCheckoutSession({
        customerId,
        priceId,
        successUrl: `${env.get('APP_URL')}/settings/billing?checkout=success`,
        cancelUrl: `${env.get('APP_URL')}/settings/billing`,
      })

      return inertia.location(url)
    } catch (error) {
      if (error instanceof StripeNotConfiguredError) {
        session.flash('error', i18n.t('flash.billing.notConfigured'))
        return response.redirect().back()
      }
      throw error
    }
  }

  async portal({ inertia, auth, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await user.load('organization')
      const org = user.organization

      if (!org.stripeCustomerId) {
        session.flash('error', i18n.t('flash.billing.noSubscription'))
        return response.redirect('/settings/billing')
      }

      const url = await this.stripeService.createPortalSession(
        org.stripeCustomerId,
        `${env.get('APP_URL')}/settings/billing`
      )

      return inertia.location(url)
    } catch (error) {
      if (error instanceof StripeNotConfiguredError) {
        session.flash('error', i18n.t('flash.billing.notConfigured'))
        return response.redirect().back()
      }
      throw error
    }
  }

  async webhook({ request, response }: HttpContext) {
    const rawBody = request.raw() ?? ''
    const signature = request.header('stripe-signature') ?? ''

    let event: Stripe.Event
    try {
      event = this.stripeService.constructWebhookEvent(rawBody, signature)
    } catch {
      return response.badRequest({ error: 'Invalid signature' })
    }

    await this.handleEvent(event)

    return response.ok({ received: true })
  }

  private async handleEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.subscriptionService.syncFromCheckoutSession(
          event.data.object as Stripe.Checkout.Session
        )
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.subscriptionService.syncFromSubscriptionEvent(
          event.data.object as Stripe.Subscription
        )
        break
    }
  }
}
