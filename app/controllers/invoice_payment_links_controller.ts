import {
  InvoiceNotPayableError,
  OnlinePaymentsUnavailableError,
  PaymentLinkNotFoundError,
} from '#exceptions/billing_errors'
import OnlinePaymentService from '#services/online_payment_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Page publique de paiement d'une facture (`/pay/:token`, #876) : sans login,
 * le jeton opaque fait office d'autorisation. Elle ne montre que ce que la
 * facture elle-même montre au client (émetteur, numéro, montant, échéances).
 */
@inject()
export default class InvoicePaymentLinksController {
  constructor(private onlinePaymentService: OnlinePaymentService) {}

  async show({ params, request, inertia, response }: HttpContext) {
    try {
      const payment = await this.onlinePaymentService.publicView(
        String(params.token),
        request.input('status') === 'success'
      )
      return inertia.render('pay/show', { payment })
    } catch (error) {
      // Jeton inconnu : la même page, en « lien invalide », plutôt qu'une 404
      // nue — le client a le plus souvent recopié un lien tronqué.
      if (error instanceof PaymentLinkNotFoundError) {
        response.status(404)
        return inertia.render('pay/show', { payment: null })
      }
      throw error
    }
  }

  /** Ouvre la session Checkout sur le compte du loueur et y envoie le client. */
  async checkout({ params, inertia, response, session, i18n }: HttpContext) {
    const token = String(params.token)
    try {
      const url = await this.onlinePaymentService.createCheckout(token)
      return inertia.location(url)
    } catch (error) {
      if (error instanceof PaymentLinkNotFoundError) {
        return response.redirect(`/pay/${token}`)
      }
      if (
        error instanceof InvoiceNotPayableError ||
        error instanceof OnlinePaymentsUnavailableError
      ) {
        session.flash('error', i18n.t('flash.onlinePayments.notPayable'))
        return response.redirect(`/pay/${token}`)
      }
      throw error
    }
  }
}
