import {
  NavigationLogNotFoundError,
  NavigationLogValidationError,
} from '#exceptions/navigation_log_errors'
import BoatEngine from '#models/boat_engine'
import NavigationLog from '#models/navigation_log'
import type Boat from '#models/boat'
import type {
  CloseNavigationLogPayload,
  CreateNavigationLogPayload,
} from '#shared/types/navigation_log'
import { toDateTime } from '#shared/helpers/maintenance'
import db from '@adonisjs/lucid/services/db'

export { NavigationLogNotFoundError, NavigationLogValidationError }
export type { CreateNavigationLogPayload, CloseNavigationLogPayload }

export default class NavigationLogService {
  async listForBoat(boat: Boat) {
    return await NavigationLog.query()
      .where('boatId', boat.id)
      .orderBy('departedAt', 'desc')
      .orderBy('id', 'desc')
  }

  async createForBoat(boat: Boat, payload: CreateNavigationLogPayload) {
    const departedAt = toDateTime(payload.departedAt)

    return await NavigationLog.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
      departedAt,
      arrivedAt: null,
      departurePortId: payload.departurePortId ?? null,
      departurePortName: payload.departurePortName?.trim() || null,
      arrivalPortId: null,
      arrivalPortName: null,
      distanceNm: null,
      engineHoursStart:
        payload.engineHoursStart !== null && payload.engineHoursStart !== undefined
          ? String(payload.engineHoursStart)
          : null,
      engineHoursEnd: null,
      fuelConsumedLiters: null,
      windForceBeaufort: payload.windForceBeaufort ?? null,
      seaState: payload.seaState ?? null,
      crewCount: payload.crewCount ?? null,
      notes: payload.notes?.trim() || null,
    })
  }

  async closeTrip(boat: Boat, logId: number, payload: CloseNavigationLogPayload) {
    const log = await NavigationLog.query()
      .where('id', logId)
      .where('boatId', boat.id)
      .where('status', 'in_progress')
      .first()

    if (!log) throw new NavigationLogNotFoundError()

    const arrivedAt = toDateTime(payload.arrivedAt)

    if (arrivedAt <= log.departedAt) {
      throw new NavigationLogValidationError(
        'Arrival must be after departure',
        'arrivedAtBeforeDeparture'
      )
    }

    if (
      payload.engineHoursEnd !== null &&
      payload.engineHoursEnd !== undefined &&
      log.engineHoursStart !== null &&
      payload.engineHoursEnd < Number(log.engineHoursStart)
    ) {
      throw new NavigationLogValidationError(
        'Engine hours end must be >= engine hours start',
        'engineHoursEndBeforeStart'
      )
    }

    await db.transaction(async (trx) => {
      log.useTransaction(trx)

      log.status = 'completed'
      log.arrivedAt = arrivedAt
      log.arrivalPortId = payload.arrivalPortId ?? null
      log.arrivalPortName = payload.arrivalPortName?.trim() || null
      log.distanceNm =
        payload.distanceNm !== null && payload.distanceNm !== undefined
          ? String(payload.distanceNm)
          : null
      log.engineHoursEnd =
        payload.engineHoursEnd !== null && payload.engineHoursEnd !== undefined
          ? String(payload.engineHoursEnd)
          : null
      log.fuelConsumedLiters =
        payload.fuelConsumedLiters !== null && payload.fuelConsumedLiters !== undefined
          ? String(payload.fuelConsumedLiters)
          : null
      log.windForceBeaufort = payload.windForceBeaufort ?? log.windForceBeaufort
      log.seaState = payload.seaState ?? log.seaState
      log.crewCount = payload.crewCount ?? log.crewCount
      if (payload.notes !== undefined) {
        log.notes = payload.notes?.trim() || null
      }

      await log.save()

      if (payload.engineHoursEnd !== null && payload.engineHoursEnd !== undefined) {
        const engine = await BoatEngine.query()
          .useTransaction(trx)
          .where('boatId', boat.id)
          .whereNotIn('status', ['retired', 'out_of_service'])
          .orderBy('id', 'asc')
          .first()

        if (engine && (engine.hours === null || engine.hours < payload.engineHoursEnd)) {
          engine.hours = payload.engineHoursEnd
          await engine.save()
        }
      }
    })

    return log
  }

  async deleteForBoat(boat: Boat, logId: number) {
    const log = await NavigationLog.query().where('id', logId).where('boatId', boat.id).first()
    if (!log) throw new NavigationLogNotFoundError()
    await log.delete()
  }
}
