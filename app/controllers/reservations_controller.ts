import BoatReservationService from '#services/boat_reservation_service'
import Boat from '#models/boat'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type {
  BoatReservationRow,
  FleetBoatCalendarEntry,
  FleetBoatOption,
} from '#shared/types/reservation'

@inject()
export default class ReservationsController {
  constructor(private reservationService: BoatReservationService) {}

  async index({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const rawBoatId = request.qs().boatId
    const selectedBoatId = rawBoatId ? Number(rawBoatId) : null

    const [boats, reservations] = await Promise.all([
      user.organizationId
        ? Boat.query()
            .select(['id', 'name'])
            .where('organizationId', user.organizationId)
            .orderBy('name')
        : Promise.resolve([]),
      this.reservationService.listForOrg(user, selectedBoatId),
    ])

    const boatOptions: FleetBoatOption[] = boats.map((b) => ({ id: b.id, name: b.name }))

    const rows: BoatReservationRow[] = reservations.map((r) => ({
      id: r.id,
      boatId: r.boatId,
      boatName: r.boat?.name ?? '',
      organizationId: r.organizationId,
      status: r.status,
      startsAt: r.startsAt.toISO()!,
      endsAt: r.endsAt.toISO()!,
      clientName: r.clientName,
      clientEmail: r.clientEmail,
      clientPhone: r.clientPhone,
      notes: r.notes,
      totalPrice: r.totalPrice,
      createdAt: r.createdAt.toISO()!,
    }))

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
    const calendarEntries = Array.from(calendarEntriesMap.values())

    return inertia.render('reservations/index', {
      reservations: rows,
      calendarEntries,
      boats: boatOptions,
      selectedBoatId,
    })
  }
}
