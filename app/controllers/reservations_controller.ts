import BoatReservationService from '#services/boat_reservation_service'
import InvoiceService from '#services/invoice_service'
import QuotaService from '#services/quota_service'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { FleetBoatCalendarEntry } from '#shared/types/reservation'
import type { InvoiceLink } from '#shared/types/invoice'

@inject()
export default class ReservationsController {
  constructor(
    private reservationService: BoatReservationService,
    private invoiceService: InvoiceService,
    private quotaService: QuotaService
  ) {}

  async index({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    const rawBoatId = request.qs().boatId
    const selectedBoatId = rawBoatId ? Number(rawBoatId) : null

    const [boats, reservations] = await Promise.all([
      this.reservationService.listBoatsForOrg(user),
      this.reservationService.listForOrg(user, selectedBoatId),
    ])

    // Surface the reservation ↔ document link (org-scoped batch lookup) and
    // whether the org may generate quotes (Enterprise gating).
    const canCreateQuote =
      user.organization !== null && this.quotaService.canManageInvoices(user.organization)
    const linksByReservation =
      user.organizationId !== null
        ? await this.invoiceService.listLinksByReservationIds(
            user.organizationId,
            reservations.map((r) => r.id)
          )
        : new Map<number, InvoiceLink[]>()

    const rows = reservations.map((r) =>
      toBoatReservationRow(r, r.boat?.name ?? '', linksByReservation.get(r.id) ?? [])
    )

    const calendarEntriesMap = new Map<number, FleetBoatCalendarEntry>()
    for (const row of rows) {
      if (!calendarEntriesMap.has(row.boatId)) {
        calendarEntriesMap.set(row.boatId, {
          boatId: row.boatId,
          boatName: row.boatName,
          reservations: [],
        })
      }
      calendarEntriesMap.get(row.boatId)!.reservations.push(row)
    }

    return inertia.render('reservations/index', {
      reservations: rows,
      calendarEntries: Array.from(calendarEntriesMap.values()),
      boats,
      selectedBoatId,
      canCreateQuote,
    })
  }
}
