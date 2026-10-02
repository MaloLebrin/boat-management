import Boat from '#models/boat'
import MarinaStay from '#models/marina_stay'
import MooringContract from '#models/mooring_contract'
import type Port from '#models/port'
import MarinaStayService from '#services/marina_stay_service'
import MooringContractService from '#services/mooring_contract_service'
import SpotService from '#services/spot_service'
import { MARINA_STAY_ACTIVE_STATUSES } from '#shared/constants/marina'
import { occupancyRate, overlapNights } from '#shared/helpers/marina'
import type { HarbourOfficeData, MarinaOccupancy } from '#shared/types/marina'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

/** Escales qui comptent dans l'occupation : arrivées, parties, facturées. */
const OCCUPYING_STAY_STATUSES = ['arrived', 'departed', 'invoiced'] as const

/**
 * Onglet « Capitainerie » de la fiche port (#891) : escales, contrats,
 * arrivées et départs du jour, taux d'occupation.
 */
@inject()
export default class HarbourOfficeService {
  constructor(
    private spotService: SpotService,
    private marinaStayService: MarinaStayService,
    private mooringContractService: MooringContractService
  ) {}

  async forPort(port: Port, now: DateTime = DateTime.now()): Promise<HarbourOfficeData> {
    const today = now.toISODate()!
    const [stays, contracts, occupancy] = await Promise.all([
      this.marinaStayService.listForPort(port, today),
      this.mooringContractService.listForPort(port, today),
      this.occupancy(port, today),
    ])

    return {
      stays,
      contracts,
      occupancy,
      arrivalsToday: stays
        .filter((s) => s.status === 'expected' && s.arrivalOn === today)
        .map((s) => s.id),
      departuresToday: stays
        .filter((s) => s.status === 'arrived' && s.departureOn <= today)
        .map((s) => s.id),
      today,
    }
  }

  /**
   * Occupation du jour et du mois en cours.
   *
   * - **Jour** : une place est occupée si un bateau de la flotte y est amarré
   *   (`boats.spot_id`) ou si une escale `arrived` la tient.
   * - **Mois** : nuitées occupées / (places × nuits du mois). Une nuitée est
   *   occupée par une escale (arrivée, partie ou facturée) ou par un contrat
   *   actif sur la période ; une même place-nuit n'est comptée qu'une fois.
   *   Un bateau amarré sans escale ni contrat compte pour les nuits écoulées
   *   du mois — c'est le titulaire à l'année géré hors contrat.
   */
  async occupancy(port: Port, today: string): Promise<MarinaOccupancy> {
    const spots = await this.spotService.listForPort(port.id)
    const spotIds = spots.map((s) => s.id)
    const totalSpots = spots.length
    if (totalSpots === 0) return { totalSpots: 0, occupiedNow: 0, rateNow: 0, rateMonth: 0 }

    const monthStart = DateTime.fromISO(today).startOf('month').toISODate()!
    const monthEnd = DateTime.fromISO(today).startOf('month').plus({ months: 1 }).toISODate()!
    const nightsInMonth = DateTime.fromISO(monthStart).daysInMonth!

    const [berthed, stays, contracts] = await Promise.all([
      Boat.query().whereIn('spotId', spotIds).whereNull('deletedAt').select('id', 'spotId'),
      MarinaStay.query()
        .whereIn('spotId', spotIds)
        .whereIn('status', [...OCCUPYING_STAY_STATUSES, ...MARINA_STAY_ACTIVE_STATUSES])
        .where('arrivalOn', '<', monthEnd)
        .where('departureOn', '>', monthStart)
        .select('spotId', 'status', 'arrivalOn', 'departureOn'),
      MooringContract.query()
        .whereIn('spotId', spotIds)
        .where('status', 'active')
        .where('startsOn', '<', monthEnd)
        .where((q) => q.whereNull('endsOn').orWhere('endsOn', '>=', monthStart))
        .select('spotId', 'startsOn', 'endsOn'),
    ])

    const occupiedNowSet = new Set<number>()
    for (const boat of berthed) if (boat.spotId !== null) occupiedNowSet.add(boat.spotId)
    for (const stay of stays) {
      if (stay.status === 'arrived') occupiedNowSet.add(stay.spotId)
    }

    // Nuits occupées par place : un jeu de jours par place, pour ne pas compter
    // deux fois une nuit couverte à la fois par un contrat et une escale.
    const nightsBySpot = new Map<number, Set<number>>()
    const mark = (spotId: number, start: string, end: string | null) => {
      const from = start > monthStart ? start : monthStart
      const count = overlapNights(start, end, monthStart, monthEnd)
      if (count === 0) return
      const set = nightsBySpot.get(spotId) ?? new Set<number>()
      const offset = DateTime.fromISO(from).day - 1
      for (let i = 0; i < count; i++) set.add(offset + i)
      nightsBySpot.set(spotId, set)
    }

    for (const stay of stays) {
      if (
        !OCCUPYING_STAY_STATUSES.includes(stay.status as (typeof OCCUPYING_STAY_STATUSES)[number])
      )
        continue
      mark(stay.spotId, stay.arrivalOn.toISODate()!, stay.departureOn.toISODate()!)
    }
    for (const contract of contracts) {
      // `endsOn` est inclus, la borne de `overlapNights` exclusive : lendemain.
      const end = contract.endsOn ? contract.endsOn.plus({ days: 1 }).toISODate()! : null
      mark(contract.spotId, contract.startsOn.toISODate()!, end)
    }
    for (const boat of berthed) {
      if (boat.spotId === null || nightsBySpot.has(boat.spotId)) continue
      mark(boat.spotId, monthStart, today)
    }

    let occupiedNights = 0
    for (const set of nightsBySpot.values()) occupiedNights += set.size

    return {
      totalSpots,
      occupiedNow: occupiedNowSet.size,
      rateNow: occupancyRate(occupiedNowSet.size, totalSpots, 1),
      rateMonth: occupancyRate(occupiedNights, totalSpots, nightsInMonth),
    }
  }
}
