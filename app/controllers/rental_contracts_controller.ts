import { BoatNotFoundError } from '#exceptions/boat_errors'
import {
  RentalContractAlreadyExistsError,
  RentalContractInvalidTransitionError,
  RentalContractNotFoundError,
} from '#exceptions/rental_contract_errors'
import BoatService from '#services/boat_service'
import BoatReservationService from '#services/boat_reservation_service'
import RentalContractService from '#services/rental_contract_service'
import RentalContractPdfService from '#services/rental_contract_pdf_service'
import EmailQueueService from '#services/email_queue_service'
import OrganizationService from '#services/organization_service'
import RentalContractPolicy from '#policies/rental_contract_policy'
import { toRentalContractRow } from '#transformers/rental_contract_transformer'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type Boat from '#models/boat'
import type BoatReservation from '#models/boat_reservation'
import type User from '#models/user'

@inject()
export default class RentalContractsController {
  constructor(
    private boatService: BoatService,
    private reservationService: BoatReservationService,
    private contractService: RentalContractService,
    private pdfService: RentalContractPdfService,
    private emailQueueService: EmailQueueService,
    private organizationService: OrganizationService
  ) {}

  private async resolve(
    user: User,
    boatId: number,
    reservationId: number,
    response: HttpContext['response']
  ): Promise<{ boat: Boat; reservation: BoatReservation } | null> {
    let boat: Boat
    try {
      boat = await this.boatService.getForUserOrFail(user, boatId)
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return null
      }
      throw error
    }

    const reservation = await this.reservationService.findForBoat(user, boat, reservationId)
    if (!reservation) {
      response.redirect(`/boats/${boatId}/reservations`)
      return null
    }

    return { boat, reservation }
  }

  async show({ inertia, params, auth, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded

    await bouncer.with(RentalContractPolicy).authorize('view', reservation)

    const contract = await this.contractService.findForReservation(user, reservation)

    const [canEdit, canDelete] = await Promise.all([
      bouncer.with(RentalContractPolicy).allows('edit', reservation),
      bouncer.with(RentalContractPolicy).allows('delete', reservation),
    ])

    return inertia.render('boats/reservation_contract', {
      boat: { id: boat.id, name: boat.name },
      reservation: toBoatReservationRow(reservation, boat.name),
      contract: contract ? toRentalContractRow(contract, boat) : null,
      canEdit,
      canDelete,
    })
  }

  async store({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(RentalContractPolicy).authorize('create', reservation)

    try {
      await this.contractService.createForReservation(user, reservation)
    } catch (error) {
      if (error instanceof RentalContractAlreadyExistsError) {
        session.flash('error', i18n.t('flash.rentalContracts.alreadyExists'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.rentalContracts.created'))
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
  }

  async downloadPdf({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(RentalContractPolicy).authorize('view', reservation)

    const contract = await this.contractService.findForReservation(user, reservation)
    if (!contract) {
      session.flash('error', i18n.t('flash.rentalContracts.notFound'))
      return response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
    }

    const org = await this.organizationService.findOrFail(boat.organizationId)
    const { buffer, filename } = await this.pdfService.generate(contract, org, i18n)

    const inline = request.input('inline') === '1'
    response.header('Content-Type', 'application/pdf')
    response.header(
      'Content-Disposition',
      inline ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`
    )
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async send({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(RentalContractPolicy).authorize('edit', reservation)

    const contract = await this.contractService.findForReservation(user, reservation)
    if (!contract) {
      session.flash('error', i18n.t('flash.rentalContracts.notFound'))
      return response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
    }

    const clientEmail = contract.client?.email ?? reservation.clientEmail
    if (!clientEmail) {
      session.flash('error', i18n.t('flash.rentalContracts.noClientEmail'))
      return response.redirect().back()
    }

    await this.emailQueueService.sendRentalContract({
      contractId: contract.id,
      organizationId: boat.organizationId,
      to: clientEmail,
      locale: i18n.locale,
    })

    try {
      await this.contractService.markSent(contract)
    } catch (error) {
      if (error instanceof RentalContractInvalidTransitionError) {
        session.flash('error', i18n.t('flash.rentalContracts.invalidTransition'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.rentalContracts.sent'))
    return response.redirect().back()
  }

  async sign({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(RentalContractPolicy).authorize('edit', reservation)

    const contract = await this.contractService.findForReservation(user, reservation)
    if (!contract) {
      session.flash('error', i18n.t('flash.rentalContracts.notFound'))
      return response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
    }

    try {
      await this.contractService.markSigned(contract)
    } catch (error) {
      if (error instanceof RentalContractInvalidTransitionError) {
        session.flash('error', i18n.t('flash.rentalContracts.invalidTransition'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.rentalContracts.signed'))
    return response.redirect().back()
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.resolve(
      user,
      Number(params.boatId),
      Number(params.reservationId),
      response
    )
    if (!loaded) return

    const { boat, reservation } = loaded
    await bouncer.with(RentalContractPolicy).authorize('delete', reservation)

    try {
      await this.contractService.deleteForReservation(user, reservation)
    } catch (error) {
      if (error instanceof RentalContractNotFoundError) {
        session.flash('error', i18n.t('flash.rentalContracts.notFound'))
        return response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      }
      throw error
    }

    session.flash('success', i18n.t('flash.rentalContracts.deleted'))
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
  }
}
