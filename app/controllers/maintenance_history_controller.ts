import Boat from '#models/boat'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import type { HttpContext } from '@adonisjs/core/http'

interface MaintenanceHistoryEvent {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
  boatEngineId: number | null
  boatSailId: number | null
  boatRigId: number | null
  parts: Array<{ id: number; name: string; quantity: number | null }>
}

interface MaintenanceHistoryStats {
  totalEvents: number
  totalParts: number
  totalBoats: number
}

export default class MaintenanceHistoryController {
  async index({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (!user.organizationId) {
      return inertia.render('maintenance/history', {
        events: [],
        stats: { totalEvents: 0, totalParts: 0, totalBoats: 0 },
      })
    }

    const boats = await Boat.query().where('organizationId', user.organizationId)
    const boatIds = boats.map((b) => b.id)
    const boatMap = new Map(boats.map((b) => [b.id, b.name]))

    if (boatIds.length === 0) {
      return inertia.render('maintenance/history', {
        events: [],
        stats: { totalEvents: 0, totalParts: 0, totalBoats: 0 },
      })
    }

    const rawEvents = await BoatMaintenanceEvent.query()
      .whereIn('boatId', boatIds)
      .preload('parts')
      .orderBy('performedAt', 'desc')

    const events: MaintenanceHistoryEvent[] = rawEvents.map((ev) => ({
      id: ev.id,
      boatId: ev.boatId,
      boatName: boatMap.get(ev.boatId) ?? '',
      subject: ev.subject,
      title: ev.title,
      notes: ev.notes,
      performedAt: ev.performedAt.toISODate()!,
      engineCaption: ev.engineCaption,
      sailCaption: ev.sailCaption,
      boatEngineId: ev.boatEngineId,
      boatSailId: ev.boatSailId,
      boatRigId: ev.boatRigId,
      parts: ev.parts.map((p) => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
      })),
    }))

    const distinctBoatIds = new Set(events.map((e) => e.boatId))
    const totalParts = events.reduce((acc, ev) => acc + ev.parts.length, 0)

    const stats: MaintenanceHistoryStats = {
      totalEvents: events.length,
      totalParts,
      totalBoats: distinctBoatIds.size,
    }

    return inertia.render('maintenance/history', { events, stats })
  }
}
