import BoatOwnerService from '#services/boat_owner_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatReservationService from '#services/boat_reservation_service'
import OwnerPortalService from '#services/owner_portal_service'
import {
  OwnerApprovalNotPendingError,
  OwnerTaskNotFoundError,
} from '#exceptions/owner_portal_errors'
import { toBoatOwnerSummary } from '#transformers/boat_transformer'
import { toBoatOwnerMaintenanceEvent } from '#transformers/maintenance_transformer'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { toInvoiceRow } from '#transformers/invoice_transformer'
import {
  toOwnerDocumentRow,
  toOwnerExpenseRow,
  toOwnerIncidentRow,
  toOwnerTaskRow,
  toOwnerTripRow,
} from '#transformers/boat_owner_transformer'
import { createOwnerRequestValidator } from '#validators/owner_portal'
import type { OwnerApprovalDecision } from '#shared/types/owner_portal'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatOwnerPortalController {
  constructor(
    private boatOwnerService: BoatOwnerService,
    private maintenanceService: BoatMaintenanceService,
    private reservationService: BoatReservationService,
    private portalService: OwnerPortalService
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

    const [
      maintenanceEvents,
      reservations,
      reservationInvoices,
      addressedInvoices,
      documents,
      expenses,
      incidents,
      trips,
      tasks,
    ] = await Promise.all([
      this.maintenanceService.listForBoat(boat),
      this.reservationService.listForBoat(user, boat),
      this.boatOwnerService.listInvoicesForBoat(boat),
      this.portalService.listInvoicesAddressedTo(user, boat),
      this.portalService.listDocuments(boat),
      this.portalService.listExpenses(boat),
      this.portalService.listIncidents(boat),
      this.portalService.listTrips(boat),
      this.portalService.listTasks(boat),
    ])
    const dashboard = await this.portalService.dashboard(boat, expenses, documents)

    // Une facture peut être à la fois celle d'une location du bateau et
    // adressée au propriétaire : une seule ligne.
    const invoices = [...addressedInvoices, ...reservationInvoices]
      .filter((invoice, index, all) => all.findIndex((other) => other.id === invoice.id) === index)
      .sort((a, b) => b.issuedAt.toMillis() - a.issuedAt.toMillis())

    return inertia.render('owner/boats/show', {
      boat: toBoatOwnerSummary(boat),
      dashboard,
      maintenanceEvents: maintenanceEvents.map(toBoatOwnerMaintenanceEvent),
      reservations: reservations.map((reservation) => toBoatReservationRow(reservation, boat.name)),
      invoices: invoices.map(toInvoiceRow),
      documents: documents.map(toOwnerDocumentRow),
      expenses: expenses.map(toOwnerExpenseRow),
      incidents: incidents.map(toOwnerIncidentRow),
      trips: trips.map(toOwnerTripRow),
      requests: tasks.map(toOwnerTaskRow),
    })
  }

  /** Demande au gestionnaire (#890) : devient une tâche de maintenance côté équipe. */
  async storeRequest({ request, params, auth, response, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.boatOwnerService.getOwnedBoat(user, Number(params.id))
    if (!boat) {
      session.flash('error', i18n.t('flash.owner.boatNotFound'))
      return response.redirect('/owner/boats')
    }

    const payload = await request.validateUsing(createOwnerRequestValidator)
    await this.portalService.createRequest(user, boat, payload)

    session.flash('success', i18n.t('flash.owner.requestCreated'))
    return response.redirect().back()
  }

  async approve(ctx: HttpContext) {
    return this.decide(ctx, 'approve')
  }

  async reject(ctx: HttpContext) {
    return this.decide(ctx, 'reject')
  }

  private async decide(
    { params, auth, response, session, i18n }: HttpContext,
    decision: OwnerApprovalDecision
  ) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.boatOwnerService.getOwnedBoat(user, Number(params.id))
    if (!boat) {
      session.flash('error', i18n.t('flash.owner.boatNotFound'))
      return response.redirect('/owner/boats')
    }

    try {
      await this.portalService.decide(user, boat, Number(params.taskId), decision)
    } catch (error) {
      if (error instanceof OwnerTaskNotFoundError) {
        session.flash('error', i18n.t('flash.owner.taskNotFound'))
        return response.redirect().back()
      }
      if (error instanceof OwnerApprovalNotPendingError) {
        session.flash('error', i18n.t('flash.owner.approvalNotPending'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash(
      'success',
      i18n.t(decision === 'approve' ? 'flash.owner.approved' : 'flash.owner.rejected')
    )
    return response.redirect().back()
  }
}
