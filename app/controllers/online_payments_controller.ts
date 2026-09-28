import {
  OnlinePaymentsUnavailableError,
  StripeNotConfiguredError,
} from '#exceptions/billing_errors'
import OrganizationPolicy from '#policies/organization_policy'
import OnlinePaymentService from '#services/online_payment_service'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Connexion du compte Stripe de l'organisation (Stripe Connect, #876), depuis
 * `/settings/billing`. Réservé à `subscription.manage`, comme l'abonnement :
 * c'est le compte sur lequel arrive l'argent des clients.
 */
@inject()
export default class OnlinePaymentsController {
  constructor(private onlinePaymentService: OnlinePaymentService) {}

  /** Lance (ou reprend) l'onboarding Stripe : redirection hors de l'app. */
  async connect({ auth, bouncer, inertia, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageBilling')
    await user.load('organization')

    try {
      const url = await this.onlinePaymentService.startOnboarding(user.organization, user)
      return inertia.location(url)
    } catch (error) {
      if (
        error instanceof OnlinePaymentsUnavailableError ||
        error instanceof StripeNotConfiguredError
      ) {
        session.flash('error', i18n.t('flash.onlinePayments.unavailable'))
        return response.redirect(BILLING_SETTINGS_PATH)
      }
      throw error
    }
  }

  /**
   * Lien d'onboarding expiré : Stripe renvoie ici (navigation complète, pas
   * une visite Inertia) pour en obtenir un neuf.
   */
  async refresh({ auth, bouncer, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageBilling')
    await user.load('organization')

    try {
      const url = await this.onlinePaymentService.startOnboarding(user.organization, user)
      return response.redirect(url)
    } catch (error) {
      if (
        error instanceof OnlinePaymentsUnavailableError ||
        error instanceof StripeNotConfiguredError
      ) {
        session.flash('error', i18n.t('flash.onlinePayments.unavailable'))
        return response.redirect(BILLING_SETTINGS_PATH)
      }
      throw error
    }
  }

  /** Retour d'onboarding : relit l'état du compte, sans attendre le webhook. */
  async return({ auth, bouncer, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageBilling')
    await user.load('organization')
    const org = user.organization

    try {
      await this.onlinePaymentService.refreshAccountStatus(org)
    } catch (error) {
      if (!(error instanceof StripeNotConfiguredError)) throw error
    }

    const state = this.onlinePaymentService.accountState(org)
    if (state === 'active') {
      session.flash('success', i18n.t('flash.onlinePayments.connected'))
    } else if (state === 'pending') {
      session.flash('info', i18n.t('flash.onlinePayments.pending'))
    }
    return response.redirect(BILLING_SETTINGS_PATH)
  }

  async disconnect({ auth, bouncer, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageBilling')
    await user.load('organization')

    await this.onlinePaymentService.disconnect(user.organization, user.id)

    session.flash('success', i18n.t('flash.onlinePayments.disconnected'))
    return response.redirect(BILLING_SETTINGS_PATH)
  }
}
