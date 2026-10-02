import {
  MarinaStayGuestRequiredError,
  MarinaStayLockedError,
  MarinaStayNotFoundError,
  MarinaStayNotInvoiceableError,
  MarinaStayOverlapError,
  MarinaStayTransitionError,
  SpotNotInPortError,
  SpotOutOfServiceError,
} from '#exceptions/marina_errors'
import { PortNotFoundError } from '#exceptions/port_errors'
import type Spot from '#models/spot'
import InvoicePolicy from '#policies/invoice_policy'
import SpotPolicy from '#policies/spot_policy'
import MarinaStayService from '#services/marina_stay_service'
import PortService from '#services/port_service'
import SpotService from '#services/spot_service'
import { marinaStayStatusValidator, marinaStayValidator } from '#validators/marina'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Escales de la capitainerie (#891). Toutes les routes passent par le port de
 * l'URL (`PortService.getForUserOrFail`) puis par l'escale **de ce port** :
 * une escale d'un autre port, même de l'organisation, est introuvable.
 * L'autorisation se lit sur la place (`SpotPolicy`) : qui gère les places
 * gère les escales — un `member` les pose, seul un admin les supprime.
 */
@inject()
export default class MarinaStaysController {
  constructor(
    private marinaStayService: MarinaStayService,
    private portService: PortService,
    private spotService: SpotService
  ) {}

  async store({ request, params, auth, response, bouncer, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const payload = await request.validateUsing(marinaStayValidator)
      const spot = await this.#spotOrFail(port.id, payload.spotId)
      await bouncer.with(SpotPolicy).authorize('edit', spot)

      const { warnings } = await this.marinaStayService.create(port, payload)
      // Le layout ne rend que `success` et `error` : les avertissements non
      // bloquants (bateau trop long, place attribuée) suivent la confirmation.
      session.flash(
        'success',
        [
          i18n.t('flash.marina.stayCreated'),
          ...warnings.map((code) => i18n.t(`flash.marina.warnings.${code}`)),
        ].join(' ')
      )
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      return this.#flashError(error, session, i18n, response)
    }
  }

  async updateStatus({ request, params, auth, response, bouncer, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const stay = await this.marinaStayService.getForPortOrFail(port, Number(params.marinaStayId))
      await bouncer.with(SpotPolicy).authorize('edit', stay.spot)
      const { status } = await request.validateUsing(marinaStayStatusValidator)
      await this.marinaStayService.transition(stay, status)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      return this.#flashError(error, session, i18n, response)
    }
  }

  /** Brouillon de facture pré-rempli, puis direction la facture pour relecture. */
  async invoice({ params, auth, response, bouncer, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const stay = await this.marinaStayService.getForPortOrFail(port, Number(params.marinaStayId))
      await bouncer.with(SpotPolicy).authorize('edit', stay.spot)
      await bouncer.with(InvoicePolicy).authorize('create')
      const invoice = await this.marinaStayService.invoice(stay, i18n, user.id)
      session.flash('success', i18n.t('flash.marina.stayInvoiced'))
      return response.redirect(`/invoices/${invoice.id}`)
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      return this.#flashError(error, session, i18n, response)
    }
  }

  async destroy({ params, auth, response, bouncer, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const stay = await this.marinaStayService.getForPortOrFail(port, Number(params.marinaStayId))
      await bouncer.with(SpotPolicy).authorize('delete', stay.spot)
      await this.marinaStayService.delete(stay)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      return this.#flashError(error, session, i18n, response)
    }
  }

  async #spotOrFail(portId: number, spotId: number): Promise<Spot> {
    const spot = await this.spotService.findInPort(portId, spotId)
    if (!spot) throw new SpotNotInPortError()
    return spot
  }

  #flashError(
    error: unknown,
    session: HttpContext['session'],
    i18n: HttpContext['i18n'],
    response: HttpContext['response']
  ) {
    const key = (() => {
      if (error instanceof MarinaStayNotFoundError) return 'stayNotFound'
      if (error instanceof SpotNotInPortError) return 'spotNotInPort'
      if (error instanceof SpotOutOfServiceError) return 'spotOutOfService'
      if (error instanceof MarinaStayGuestRequiredError) return 'guestRequired'
      if (error instanceof MarinaStayTransitionError) return 'invalidTransition'
      if (error instanceof MarinaStayNotInvoiceableError) return 'notInvoiceable'
      if (error instanceof MarinaStayLockedError) return 'stayLocked'
      return null
    })()

    if (error instanceof MarinaStayOverlapError) {
      session.flash('error', i18n.t('flash.marina.stayOverlap', { name: error.guestName }))
      return response.redirect().back()
    }
    if (key === null) throw error
    session.flash('error', i18n.t(`flash.marina.${key}`))
    return response.redirect().back()
  }
}
