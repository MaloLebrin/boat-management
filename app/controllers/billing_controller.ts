import {
  InvalidPromoCodeError,
  ModulesRequireEnterprisePlanError,
  ModulesRequireProPlanError,
  StripeNotConfiguredError,
} from '#exceptions/billing_errors'
import PromoCodeService, { isPromotionRefusal } from '#services/promo_code_service'
import StripeService from '#services/stripe_service'
import StripeWebhookService from '#services/stripe_webhook_service'
import SubscriptionService from '#services/subscription_service'
import OrganizationModuleService from '#services/organization_module_service'
import AuditLogService from '#services/audit_log_service'
import { addonActionValidator, checkoutValidator, moduleActionValidator } from '#validators/billing'
import OrganizationPolicy from '#policies/organization_policy'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { PromoCodeRejectReason } from '#shared/types/billing'
import env from '#start/env'
import Stripe from 'stripe'

@inject()
export default class BillingController {
  constructor(
    private stripeService: StripeService,
    private subscriptionService: SubscriptionService,
    private stripeWebhookService: StripeWebhookService,
    private organizationModuleService: OrganizationModuleService,
    private auditLogService: AuditLogService,
    private promoCodeService: PromoCodeService
  ) {}

  async checkout({ request, inertia, auth, bouncer, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      // Engager l'organisation sur un plan est un geste d'admin (#843) : le
      // contrôle passe avant la validation et avant tout appel Stripe.
      await bouncer.with(OrganizationPolicy).authorize('manageBilling')
      await user.load('organization')

      const { planTier, interval, modules, promoCode } =
        await request.validateUsing(checkoutValidator)

      // Les modules add-ons ne sont vendables que sur le socle Pro (#327).
      if (modules && modules.length > 0 && planTier !== 'pro') {
        throw new ModulesRequireProPlanError()
      }

      // Code promo (#955) : résolu chez Stripe avant toute création — un code
      // refusé renvoie sur le formulaire sans avoir ouvert de session.
      const promo = promoCode ? await this.promoCodeService.resolve(promoCode) : null

      const priceIds = [
        this.stripeService.priceIdFor(planTier, interval),
        ...(modules ?? []).map((module) => this.stripeService.priceIdForModule(module, interval)),
      ]
      const customerId = await this.stripeService.getOrCreateCustomer(user.organization, user.email)

      let url: string
      try {
        url = await this.stripeService.createCheckoutSession({
          customerId,
          priceIds,
          successUrl: `${env.get('APP_URL')}/settings/billing?checkout=success`,
          cancelUrl: `${env.get('APP_URL')}/settings/billing`,
          ...(promo ? { promotionCodeId: promo.promotionCodeId } : {}),
        })
      } catch (error) {
        // Stripe refuse une restriction qu'on ne pré-vérifie pas (première
        // transaction, montant minimum, coupon limité à d'autres produits) : une
        // erreur de saisie à afficher sous le champ, pas une 500. Seulement si la
        // remise est en cause : un prix inconnu doit remonter même quand un code
        // a été saisi.
        if (
          promo &&
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          isPromotionRefusal(error)
        ) {
          throw new InvalidPromoCodeError('notApplicable')
        }
        throw error
      }

      await this.auditLogService.log({
        organizationId: user.organization.id,
        userId: user.id,
        action: 'billing.checkout',
        metadata: {
          planTier,
          interval,
          modules: modules ?? [],
          ...(promo ? { promoCode: promo.promoCode } : {}),
        },
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
      if (error instanceof InvalidPromoCodeError) {
        return this.rejectPromoCode(error.reason, { session, response, i18n })
      }
      throw error
    }
  }

  /**
   * Refus d'un code promo (#955), rendu **sous le champ** comme une erreur de
   * validation : `flashAll()` conserve la saisie, `inputErrorsBag` est le sac
   * que le middleware Inertia transforme en prop `errors`.
   */
  private rejectPromoCode(
    reason: PromoCodeRejectReason,
    { session, response, i18n }: Pick<HttpContext, 'session' | 'response' | 'i18n'>
  ) {
    session.flashAll()
    session.flash('inputErrorsBag', {
      promoCode: [i18n.t(`validator.billing.promoCode.${reason}`)],
    })
    return response.redirect().back()
  }

  async portal({ inertia, auth, bouncer, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      // Le portail Stripe permet de résilier l'abonnement et de consulter les
      // factures : réservé à `subscription.manage` comme le reste (#843).
      await bouncer.with(OrganizationPolicy).authorize('manageBilling')
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

      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'billing.portal',
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

  /**
   * Active un module add-on sur l'abonnement Pro existant (#327). Ajoute un item
   * à l'abonnement Stripe ; le webhook réconcilie ensuite `organization_modules`.
   */
  async addModule({ request, auth, bouncer, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await bouncer.with(OrganizationPolicy).authorize('manageBilling')
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

      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'billing.module_add',
        metadata: { module },
      })

      session.flash('success', i18n.t('flash.billing.moduleAdded'))
      return response.redirect().back()
    } catch (error) {
      return this.handleModuleError(error, { session, response, i18n })
    }
  }

  /** Résilie un module add-on : retire son item de l'abonnement Stripe (#327). */
  async removeModule({ request, auth, bouncer, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await bouncer.with(OrganizationPolicy).authorize('manageBilling')
      await user.load('organization')
      const org = user.organization
      const { module } = await request.validateUsing(moduleActionValidator)

      const row = await this.organizationModuleService.findSubscriptionModule(org.id, module)
      if (!row?.stripeSubscriptionItemId) {
        session.flash('error', i18n.t('flash.billing.moduleNotFound'))
        return response.redirect().back()
      }

      await this.stripeService.removeSubscriptionItem(row.stripeSubscriptionItemId)

      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'billing.module_remove',
        metadata: { module },
      })

      session.flash('success', i18n.t('flash.billing.moduleRemoved'))
      return response.redirect().back()
    } catch (error) {
      return this.handleModuleError(error, { session, response, i18n })
    }
  }

  /**
   * Active un module `granted` en self-service sur le plan Enterprise (#353).
   * Aucun appel Stripe : contrairement à Pro, l'inclusion est offerte et sans
   * impact tarifaire — on ne fait que recréer la ligne `organization_modules`.
   */
  async activateEnterpriseModule({ request, auth, bouncer, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await user.load('organization')
      const org = user.organization
      await bouncer.with(OrganizationPolicy).authorize('manageBilling')
      const { module } = await request.validateUsing(moduleActionValidator)

      if (org.plan !== 'enterprise') throw new ModulesRequireEnterprisePlanError()

      await this.organizationModuleService.grantModule(org.id, module, { source: 'granted' })

      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'billing.module_activate',
        metadata: { module },
      })

      session.flash('success', i18n.t('flash.billing.moduleActivated'))
      return response.redirect().back()
    } catch (error) {
      return this.handleModuleError(error, { session, response, i18n })
    }
  }

  /**
   * Désactive un module `granted` en self-service sur le plan Enterprise (#353).
   * `source: 'granted'` est passé explicitement à `revokeModule` : sans lui, le
   * filtre par défaut (`subscription`) laisserait la ligne intacte.
   */
  async deactivateEnterpriseModule({
    request,
    auth,
    bouncer,
    response,
    session,
    i18n,
  }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await user.load('organization')
      const org = user.organization
      await bouncer.with(OrganizationPolicy).authorize('manageBilling')
      const { module } = await request.validateUsing(moduleActionValidator)

      if (org.plan !== 'enterprise') throw new ModulesRequireEnterprisePlanError()

      await this.organizationModuleService.revokeModule(org.id, module, { source: 'granted' })

      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'billing.module_deactivate',
        metadata: { module },
      })

      session.flash('success', i18n.t('flash.billing.moduleDeactivated'))
      return response.redirect().back()
    } catch (error) {
      return this.handleModuleError(error, { session, response, i18n })
    }
  }

  /**
   * Règle la quantité d'un add-on quantitatif (ex. `extra_boats`, #333) sur
   * l'abonnement Pro actif. `quantity = 0` retire l'item ; sinon on crée l'item
   * (première souscription) ou on met à jour sa quantité. Le webhook réconcilie
   * ensuite `organization_modules`.
   */
  async setAddon({ request, auth, bouncer, response, session, i18n }: HttpContext) {
    try {
      const user = await auth.authenticate()
      await bouncer.with(OrganizationPolicy).authorize('manageBilling')
      await user.load('organization')
      const org = user.organization
      const { addon, quantity } = await request.validateUsing(addonActionValidator)

      if (org.plan !== 'pro') throw new ModulesRequireProPlanError()

      const sub = await this.subscriptionService.getActive(org.id)
      if (!sub?.stripeSubscriptionId) {
        session.flash('error', i18n.t('flash.billing.noSubscription'))
        return response.redirect().back()
      }

      const existing = await this.organizationModuleService.findSubscriptionModule(org.id, addon)

      if (quantity === 0) {
        if (!existing?.stripeSubscriptionItemId) {
          session.flash('info', i18n.t('flash.billing.addonNotActive'))
          return response.redirect().back()
        }
        await this.stripeService.removeSubscriptionItem(existing.stripeSubscriptionItemId)
        await this.auditLogService.log({
          organizationId: org.id,
          userId: user.id,
          action: 'billing.addon_set',
          metadata: { addon, quantity },
        })
        session.flash('success', i18n.t('flash.billing.addonRemoved'))
        return response.redirect().back()
      }

      if (existing?.stripeSubscriptionItemId) {
        await this.stripeService.updateSubscriptionItemQuantity(
          existing.stripeSubscriptionItemId,
          quantity
        )
      } else {
        const priceId = this.stripeService.priceIdForAddon(addon, sub.billingInterval)
        await this.stripeService.addSubscriptionItem(sub.stripeSubscriptionId, priceId, quantity)
      }

      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'billing.addon_set',
        metadata: { addon, quantity },
      })

      session.flash('success', i18n.t('flash.billing.addonUpdated'))
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
    if (error instanceof ModulesRequireEnterprisePlanError) {
      session.flash('error', i18n.t('flash.billing.modulesRequireEnterprise'))
      return response.redirect().back()
    }
    // Toute erreur renvoyée par l'API Stripe (ex. `resource_missing` quand une
    // requête concurrente a déjà retiré l'item avant la réconciliation du
    // webhook) est traitée en flash plutôt qu'en 500 non géré. Contrairement à
    // l'ajout — protégé par une clé d'idempotence —, un retrait dupliqué ne peut
    // pas réussir deux fois côté Stripe ; on l'absorbe donc proprement ici.
    if (error instanceof Stripe.errors.StripeError) {
      session.flash('error', i18n.t('flash.billing.moduleActionFailed'))
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

    // Déduplication par `event.id` puis aiguillage, dans une seule transaction
    // (#703). Un rejeu ressort `false` et n'a rien écrit ; la réponse est la
    // même dans les deux cas — l'événement a bien été reçu, c'est tout ce que
    // Stripe attend de savoir.
    await this.stripeWebhookService.process(event)

    return response.ok({ received: true })
  }

  /**
   * Endpoint des comptes connectés (Stripe Connect, #876) : même traitement
   * idempotent que ci-dessus, mais signé par le secret de cet endpoint. Les
   * événements y portent `account`, que `StripeWebhookService` aiguille vers
   * le règlement des factures.
   */
  async connectWebhook({ request, response }: HttpContext) {
    const rawBody = request.raw() ?? ''
    const signature = request.header('stripe-signature') ?? ''

    let event: Stripe.Event
    try {
      event = this.stripeService.constructConnectWebhookEvent(rawBody, signature)
    } catch {
      return response.badRequest({ error: 'Invalid signature' })
    }

    // Un événement signé par ce secret mais sans compte n'a rien à faire ici.
    if (!event.account) return response.ok({ received: true })

    await this.stripeWebhookService.process(event)
    return response.ok({ received: true })
  }
}
