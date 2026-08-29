import BoatReservationService from '#services/boat_reservation_service'
import InvoiceService from '#services/invoice_service'
import QuotaService from '#services/quota_service'
import {
  toBoatReservationRow,
  toFleetCalendarEntries,
} from '#transformers/boat_reservation_transformer'
import BoatPolicy from '#policies/boat_policy'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { InvoiceLink } from '#shared/types/invoice'
import { RESERVATION_TYPES, type ReservationType } from '#shared/types/reservation'

@inject()
export default class ReservationsController {
  constructor(
    private reservationService: BoatReservationService,
    private invoiceService: InvoiceService,
    private quotaService: QuotaService
  ) {}

  async index({ inertia, auth, request, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    await bouncer.with(BoatPolicy).authorize('view')

    const rawBoatId = request.qs().boatId
    const selectedBoatId = rawBoatId ? Number(rawBoatId) : null

    // Filtre type de prestation (#585) — une valeur inconnue est ignorée
    // plutôt que rejetée : la page reste lisible avec une URL bricolée.
    const rawType = request.qs().type
    const selectedType = RESERVATION_TYPES.includes(rawType as ReservationType)
      ? (rawType as ReservationType)
      : null

    const [boats, reservations] = await Promise.all([
      this.reservationService.listBoatsForOrg(user),
      this.reservationService.listForOrg(user, selectedBoatId, selectedType),
    ])

    // Surface the reservation ↔ document link (org-scoped batch lookup) and
    // whether the org may generate quotes (Enterprise gating).
    const canCreateQuote =
      user.organization !== null && (await this.quotaService.canManageInvoices(user.organization))
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

    // Le calendrier liste toute la flotte (filtre bateau appliqué), pas seulement
    // les bateaux ayant une réservation : sinon les disponibilités sont invisibles (#477).
    const calendarBoats = selectedBoatId ? boats.filter((b) => b.id === selectedBoatId) : boats

    return inertia.render('reservations/index', {
      reservations: rows,
      calendarEntries: toFleetCalendarEntries(calendarBoats, rows),
      boats,
      selectedBoatId,
      selectedType,
      canCreateQuote,
    })
  }
}
