import {
  NavigationLogConflictError,
  NavigationLogInProgressError,
  NavigationLogNotFoundError,
  NavigationLogValidationError,
} from '#exceptions/navigation_log_errors'
import BoatEngine from '#models/boat_engine'
import NavigationLog from '#models/navigation_log'
import type Boat from '#models/boat'
import type {
  CloseNavigationLogPayload,
  ConflictLogSnapshot,
  CreateNavigationLogPayload,
  UpdateNavigationLogPayload,
} from '#shared/types/navigation_log'
import { toDateTime } from '#shared/helpers/date'
import db from '@adonisjs/lucid/services/db'

export {
  NavigationLogConflictError,
  NavigationLogInProgressError,
  NavigationLogNotFoundError,
  NavigationLogValidationError,
}
export type { CreateNavigationLogPayload, CloseNavigationLogPayload, UpdateNavigationLogPayload }

/**
 * Detects the PostgreSQL unique-violation raised by the partial unique index
 * guaranteeing a single in-progress trip per boat.
 */
function isInProgressUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const err = error as { code?: unknown; constraint?: unknown }
  return (
    err.code === '23505' &&
    typeof err.constraint === 'string' &&
    err.constraint.includes('one_in_progress_per_boat')
  )
}

function buildConflictSnapshot(log: NavigationLog): ConflictLogSnapshot {
  return {
    id: log.id,
    updatedAt: (log.updatedAt ?? log.createdAt).toISO()!,
    windForceBeaufort: log.windForceBeaufort,
    seaState: log.seaState,
    crewCount: log.crewCount,
    notes: log.notes,
    arrivedAt: log.arrivedAt?.toISO() ?? null,
    arrivalPortId: log.arrivalPortId,
    arrivalPortName: log.arrivalPortName,
    distanceNm: log.distanceNm !== null ? Number.parseFloat(log.distanceNm) : null,
    engineHoursEnd: log.engineHoursEnd !== null ? Number.parseFloat(log.engineHoursEnd) : null,
    fuelConsumedLiters:
      log.fuelConsumedLiters !== null ? Number.parseFloat(log.fuelConsumedLiters) : null,
  }
}

export default class NavigationLogService {
  async listForBoat(boat: Boat) {
    return await NavigationLog.query()
      .where('boatId', boat.id)
      .preload('crew')
      .orderBy('departedAt', 'desc')
      .orderBy('id', 'desc')
  }

  async createForBoat(boat: Boat, payload: CreateNavigationLogPayload) {
    const departedAt = toDateTime(payload.departedAt)

    // A boat may only have one in-progress trip at a time. Two would make the
    // "active trip" ambiguous and corrupt engine hours on the two closeTrip
    // calls. The partial unique index enforces this at the DB level (race-safe);
    // this check surfaces a friendly error for the common case.
    const existing = await NavigationLog.query()
      .where('boatId', boat.id)
      .where('status', 'in_progress')
      .first()
    if (existing) throw new NavigationLogInProgressError()

    try {
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
    } catch (error) {
      // Concurrent request slipped past the check above: the unique index rejects it.
      if (isInProgressUniqueViolation(error)) throw new NavigationLogInProgressError()
      throw error
    }
  }

  async closeTrip(boat: Boat, logId: number, payload: CloseNavigationLogPayload) {
    const log = await NavigationLog.query()
      .where('id', logId)
      .where('boatId', boat.id)
      .where('status', 'in_progress')
      .first()

    if (!log) throw new NavigationLogNotFoundError()

    if (payload.expectedUpdatedAt !== undefined && log.updatedAt) {
      if (log.updatedAt.toISO() !== payload.expectedUpdatedAt) {
        throw new NavigationLogConflictError(buildConflictSnapshot(log))
      }
    }

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
        const hoursEnd = payload.engineHoursEnd
        let engine: BoatEngine | null = null

        if (payload.boatEngineId !== null && payload.boatEngineId !== undefined) {
          // Targeted engine: must belong to this boat and be active.
          engine = await BoatEngine.query()
            .useTransaction(trx)
            .where('boatId', boat.id)
            .where('id', payload.boatEngineId)
            .whereNotIn('status', ['retired', 'out_of_service'])
            .first()
        } else {
          // No engine specified: only auto-apply the hours when the boat has
          // exactly one active engine. On multi-engine boats we don't guess —
          // writing to an arbitrary engine would corrupt its hour counter.
          const activeEngines = await BoatEngine.query()
            .useTransaction(trx)
            .where('boatId', boat.id)
            .whereNotIn('status', ['retired', 'out_of_service'])
          engine = activeEngines.length === 1 ? activeEngines[0] : null
        }

        if (engine && (engine.hours === null || engine.hours < hoursEnd)) {
          engine.hours = hoursEnd
          await engine.save()
        }
      }
    })

    return log
  }

  async getForBoat(boat: Boat, logId: number) {
    const log = await NavigationLog.query().where('id', logId).where('boatId', boat.id).first()
    if (!log) throw new NavigationLogNotFoundError()
    return log
  }

  async updateForBoat(boat: Boat, logId: number, payload: UpdateNavigationLogPayload) {
    const log = await NavigationLog.query()
      .where('id', logId)
      .where('boatId', boat.id)
      .where('status', 'in_progress')
      .first()

    if (!log) throw new NavigationLogNotFoundError()

    if (payload.expectedUpdatedAt !== undefined && log.updatedAt) {
      if (log.updatedAt.toISO() !== payload.expectedUpdatedAt) {
        throw new NavigationLogConflictError(buildConflictSnapshot(log))
      }
    }

    if (payload.windForceBeaufort !== undefined) log.windForceBeaufort = payload.windForceBeaufort
    if (payload.seaState !== undefined) log.seaState = payload.seaState
    if (payload.crewCount !== undefined) log.crewCount = payload.crewCount
    if (payload.notes !== undefined) log.notes = payload.notes?.trim() || null

    await log.save()
    return log
  }

  async deleteForBoat(boat: Boat, logId: number) {
    const log = await this.getForBoat(boat, logId)
    await log.delete()
  }
}
