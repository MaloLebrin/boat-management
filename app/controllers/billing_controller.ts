import { ModulesRequireProPlanError, StripeNotConfiguredError } from '#exceptions/billing_errors'
import StripeService from '#services/stripe_service'
import SubscriptionService from '#services/subscription_service'
import OrganizationModuleService from '#services/organization_module_service'
import { checkoutValidator, moduleActionValidator } from '#validators/billing'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import type Stripe from 'stripe'

@inject()
export default class BillingController {
  constructor(
    private stripeService: StripeService,
    private subscriptionService: SubscriptionService,
    private organizationModuleService: OrganizationModuleService
  ) {}

  async checkout({ request, inertia, auth, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await user.load('organization')

      const { planTier, interval, modules } = await request.validateUsing(checkoutValidator)

      // Les modules add-ons ne sont vendables que sur le socle Pro (#327).
      if (modules && modules.length > 0 && planTier !== 'pro') {
        throw new ModulesRequireProPlanError()
      }

      const priceIds = [
        this.stripeService.priceIdFor(planTier, interval),
        ...(modules ?? []).map((module) => this.stripeService.priceIdForModule(module, interval)),
      ]
      const customerId = await this.stripeService.getOrCreateCustomer(user.organization, user.email)

      const url = await this.stripeService.createCheckoutSession({
        customerId,
        priceIds,
        successUrl: `${env.get('APP_URL')}/settings/billing?checkout=success`,
        cancelUrl: `${env.get('APP_URL')}/settings/billing`,
      })

      return inertia.location(url)
    } catch (error) {
      if (error instanceof StripeNotConfiguredError) {
        session.flash('error', i18n.t('flash.billing.notConfigured'))
        return response.redirect().back()
      }
      if (error instanceof ModulesRequireProPlanError) {
        session.flash('error', i18n.t('flash.billing.modulesRequirePro'))
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

  /**
   * Active un module add-on sur l'abonnement Pro existant (#327). Ajoute un item
   * à l'abonnement Stripe ; le webhook réconcilie ensuite `organization_modules`.
   */
  async addModule({ request, auth, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await user.load('organization')
      const org = user.organization
      const { module } = await request.validateUsing(moduleActionValidator)

      if (org.plan !== 'pro') throw new ModulesRequireProPlanError()

      const sub = await this.subscriptionService.getActive(org.id)
      if (!sub?.stripeSubscriptionId) {
        session.flash('error', i18n.t('flash.billing.noSubscription'))
        return response.redirect().back()
      }

      // Idempotence : sans ce garde, un double-clic / retry crée un second item
      // Stripe pour le même module. La contrainte unique (organization_id, module)
      // ne réconcilie qu'un seul item — l'autre resterait facturé sans moyen de le
      // résilier depuis l'UI. On court-circuite si le module est déjà actif.
      if (await this.organizationModuleService.hasModule(org.id, module)) {
        session.flash('info', i18n.t('flash.billing.moduleAlreadyActive'))
        return response.redirect().back()
      }

      const priceId = this.stripeService.priceIdForModule(module, sub.billingInterval)
      await this.stripeService.addSubscriptionItem(sub.stripeSubscriptionId, priceId)

      session.flash('success', i18n.t('flash.billing.moduleAdded'))
      return response.redirect().back()
    } catch (error) {
      return this.handleModuleError(error, { session, response, i18n })
    }
  }

  /** Résilie un module add-on : retire son item de l'abonnement Stripe (#327). */
  async removeModule({ request, auth, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await user.load('organization')
      const org = user.organization
      const { module } = await request.validateUsing(moduleActionValidator)

      const row = await this.organizationModuleService.findSubscriptionModule(org.id, module)
      if (!row?.stripeSubscriptionItemId) {
        session.flash('error', i18n.t('flash.billing.moduleNotFound'))
        return response.redirect().back()
      }

      await this.stripeService.removeSubscriptionItem(row.stripeSubscriptionItemId)

      session.flash('success', i18n.t('flash.billing.moduleRemoved'))
      return response.redirect().back()
    } catch (error) {
      return this.handleModuleError(error, { session, response, i18n })
    }
  }

  private handleModuleError(
    error: unknown,
    { session, response, i18n }: Pick<HttpContext, 'session' | 'response' | 'i18n'>
  ) {
    if (error instanceof StripeNotConfiguredError) {
      session.flash('error', i18n.t('flash.billing.notConfigured'))
      return response.redirect().back()
    }
    if (error instanceof ModulesRequireProPlanError) {
      session.flash('error', i18n.t('flash.billing.modulesRequirePro'))
      return response.redirect().back()
    }
    throw error
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
