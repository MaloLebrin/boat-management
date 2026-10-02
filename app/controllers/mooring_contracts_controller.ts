import {
  MarinaClientNotFoundError,
  MooringContractLockedError,
  MooringContractNotFoundError,
  MooringContractOverlapError,
  SpotNotInPortError,
  SpotOutOfServiceError,
} from '#exceptions/marina_errors'
import { PortNotFoundError } from '#exceptions/port_errors'
import SpotPolicy from '#policies/spot_policy'
import MooringContractService from '#services/mooring_contract_service'
import PortService from '#services/port_service'
import SpotService from '#services/spot_service'
import { mooringContractValidator } from '#validators/marina'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Contrats d'amarrage (#891). Même cloisonnement que les escales : le port de
 * l'URL, puis le contrat de ce port ; l'autorisation se lit sur la place.
 */
@inject()
export default class MooringContractsController {
  constructor(
    private mooringContractService: MooringContractService,
    private portService: PortService,
    private spotService: SpotService
  ) {}

  async store({ request, params, auth, response, bouncer, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const payload = await request.validateUsing(mooringContractValidator)
      const spot = await this.spotService.findInPort(port.id, payload.spotId)
      if (!spot) throw new SpotNotInPortError()
      await bouncer.with(SpotPolicy).authorize('edit', spot)
      await this.mooringContractService.create(port, payload)
      session.flash('success', i18n.t('flash.marina.contractCreated'))
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      return this.#flashError(error, session, i18n, response)
    }
  }

  async terminate({ params, auth, response, bouncer, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const contract = await this.mooringContractService.getForPortOrFail(
        port,
        Number(params.contractId)
      )
      await bouncer.with(SpotPolicy).authorize('edit', contract.spot)
      await this.mooringContractService.terminate(contract)
      session.flash('success', i18n.t('flash.marina.contractTerminated'))
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      return this.#flashError(error, session, i18n, response)
    }
  }

  async destroy({ params, auth, response, bouncer, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const port = await this.portService.getForUserOrFail(user, Number(params.portId))
      const contract = await this.mooringContractService.getForPortOrFail(
        port,
        Number(params.contractId)
      )
      await bouncer.with(SpotPolicy).authorize('delete', contract.spot)
      await this.mooringContractService.delete(contract)
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PortNotFoundError) return response.redirect('/ports')
      return this.#flashError(error, session, i18n, response)
    }
  }

  #flashError(
    error: unknown,
    session: HttpContext['session'],
    i18n: HttpContext['i18n'],
    response: HttpContext['response']
  ) {
    const key = (() => {
      if (error instanceof MooringContractNotFoundError) return 'contractNotFound'
      if (error instanceof SpotNotInPortError) return 'spotNotInPort'
      if (error instanceof SpotOutOfServiceError) return 'spotOutOfService'
      if (error instanceof MarinaClientNotFoundError) return 'clientNotFound'
      if (error instanceof MooringContractOverlapError) return 'contractOverlap'
      if (error instanceof MooringContractLockedError) return 'contractLocked'
      return null
    })()
    if (key === null) throw error
    session.flash('error', i18n.t(`flash.marina.${key}`))
    return response.redirect().back()
  }
}
