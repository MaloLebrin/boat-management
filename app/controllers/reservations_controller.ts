import BoatReservationService from '#services/boat_reservation_service'
import { toBoatReservationRow } from '#transformers/boat_reservation_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { FleetBoatCalendarEntry } from '#shared/types/reservation'

@inject()
export default class ReservationsController {
  constructor(private reservationService: BoatReservationService) {}

  async index({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const rawBoatId = request.qs().boatId
    const selectedBoatId = rawBoatId ? Number(rawBoatId) : null

    const [boats, reservations] = await Promise.all([
      this.reservationService.listBoatsForOrg(user),
      this.reservationService.listForOrg(user, selectedBoatId),
    ])

    const rows = reservations.map((r) => toBoatReservationRow(r, r.boat?.name ?? ''))

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
    })
  }
}
