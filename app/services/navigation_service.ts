import Boat from '#models/boat'
import BoatFuelLog from '#models/boat_fuel_log'
import BoatIncident from '#models/boat_incident'
import NavigationLog from '#models/navigation_log'
import type User from '#models/user'
import type { IncidentStatus, IncidentType } from '#shared/types/incident'
import type {
  FleetBoatOption,
  FleetFuelLogRow,
  FleetIncidentRow,
  FleetLogbookRow,
} from '#shared/types/navigation'

export default class NavigationService {
  async getFleetBoats(user: User): Promise<FleetBoatOption[]> {
    if (!user.organizationId) return []
    const boats = await Boat.query()
      .select('id', 'name')
      .where('organizationId', user.organizationId)
      .orderBy('name', 'asc')
    return boats.map((b) => ({ id: b.id, name: b.name }))
  }

  async getFleetLogbook(user: User, boatId?: number): Promise<FleetLogbookRow[]> {
    if (!user.organizationId) return []

    const query = NavigationLog.query()
      .select(
        'id',
        'boatId',
        'status',
        'departedAt',
        'arrivedAt',
        'departurePortName',
        'arrivalPortName',
        'distanceNm',
        'crewCount',
        'seaState',
        'windForceBeaufort'
      )
      .preload('boat', (q) => q.select('id', 'name'))
      .where('organizationId', user.organizationId)
      .orderBy('departedAt', 'desc')
      .orderBy('id', 'desc')

    if (boatId) query.where('boatId', boatId)

    const logs = await query

    return logs.map((log) => ({
      id: log.id,
      boatId: log.boatId,
      boatName: log.boat.name,
      status: log.status,
      departedAt: log.departedAt.toISO()!,
      arrivedAt: log.arrivedAt?.toISO() ?? null,
      departurePortName: log.departurePortName,
      arrivalPortName: log.arrivalPortName,
      distanceNm: log.distanceNm ? Number(log.distanceNm) : null,
      crewCount: log.crewCount,
      seaState: log.seaState,
      windForceBeaufort: log.windForceBeaufort,
    }))
  }

  async getFleetFuelLogs(user: User, boatId?: number): Promise<FleetFuelLogRow[]> {
    if (!user.organizationId) return []

    const query = BoatFuelLog.query()
      .select('id', 'boatId', 'fueledAt', 'quantityLiters', 'totalCost', 'supplier', 'notes')
      .preload('boat', (q) => q.select('id', 'name'))
      .where('organizationId', user.organizationId)
      .orderBy('fueledAt', 'desc')
      .orderBy('id', 'desc')

    if (boatId) query.where('boatId', boatId)

    const logs = await query

    return logs.map((log) => ({
      id: log.id,
      boatId: log.boatId,
      boatName: log.boat.name,
      fueledAt: log.fueledAt.toISODate()!,
      quantityLiters: Number(log.quantityLiters),
      totalCost: log.totalCost ? Number(log.totalCost) : null,
      supplier: log.supplier,
      notes: log.notes,
    }))
  }

  async getFleetIncidents(user: User, boatId?: number): Promise<FleetIncidentRow[]> {
    if (!user.organizationId) return []

    const query = BoatIncident.query()
      .select(
        'id',
        'boatId',
        'occurredAt',
        'type',
        'status',
        'location',
        'description',
        'insuranceClaimed'
      )
      .preload('boat', (q) => q.select('id', 'name'))
      .where('organizationId', user.organizationId)
      .orderBy('occurredAt', 'desc')
      .orderBy('id', 'desc')

    if (boatId) query.where('boatId', boatId)

    const incidents = await query

    return incidents.map((incident) => ({
      id: incident.id,
      boatId: incident.boatId,
      boatName: incident.boat.name,
      occurredAt: incident.occurredAt.toISO()!,
      type: incident.type as IncidentType,
      status: incident.status as IncidentStatus,
      location: incident.location,
      description: incident.description,
      insuranceClaimed: incident.insuranceClaimed,
    }))
  }
}
