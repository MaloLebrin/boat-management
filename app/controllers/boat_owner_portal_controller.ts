import BoatOwnerService from '#services/boat_owner_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatReservationService from '#services/boat_reservation_service'
import { toBoatOwnerSummary } from '#transformers/boat_transformer'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { toInvoiceRow } from '#transformers/invoice_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatOwnerPortalController {
  constructor(
    private boatOwnerService: BoatOwnerService,
    private maintenanceService: BoatMaintenanceService,
    private reservationService: BoatReservationService
  ) {}

  async index({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boats = await this.boatOwnerService.listOwnedBoats(user)

    return inertia.render('owner/boats/index', {
      boats: boats.map(toBoatOwnerSummary),
    })
  }

  async show({ inertia, params, auth, response, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.boatOwnerService.getOwnedBoat(user, Number(params.id))
    if (!boat) {
      session.flash('error', i18n.t('flash.owner.boatNotFound'))
      return response.redirect('/owner/boats')
    }

    const [maintenanceEvents, reservations, invoices] = await Promise.all([
      this.maintenanceService.listForBoat(user, boat),
      this.reservationService.listForBoat(user, boat),
      this.boatOwnerService.listInvoicesForBoat(boat),
    ])

    return inertia.render('owner/boats/show', {
      boat: toBoatOwnerSummary(boat),
      maintenanceEvents,
      reservations: reservations.map((reservation) => toBoatReservationRow(reservation, boat.name)),
      invoices: invoices.map(toInvoiceRow),
    })
  }
}
