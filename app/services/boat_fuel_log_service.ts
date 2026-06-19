import {
  BoatFuelLogForbiddenError,
  BoatFuelLogNotFoundError,
  BoatFuelLogValidationError,
} from '#exceptions/fuel_log_errors'
import BoatEngine from '#models/boat_engine'
import BoatFuelLog from '#models/boat_fuel_log'
import type Boat from '#models/boat'
import type User from '#models/user'
import type { CreateFuelLogPayload } from '#shared/types/fuel_log'
import { toDateTime } from '#shared/helpers/maintenance'
import { inject } from '@adonisjs/core'

export { BoatFuelLogForbiddenError, BoatFuelLogNotFoundError, BoatFuelLogValidationError }
export type { CreateFuelLogPayload }

function assertBoatScope(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new BoatFuelLogForbiddenError()
  }
}

@inject()
export default class BoatFuelLogService {
  async listForBoat(user: User, boat: Boat) {
    assertBoatScope(user, boat)

    return await BoatFuelLog.query()
      .where('boatId', boat.id)
      .orderBy('fueledAt', 'desc')
      .orderBy('id', 'desc')
  }

  async createForBoat(user: User, boat: Boat, payload: CreateFuelLogPayload) {
    assertBoatScope(user, boat)

    if (payload.boatEngineId) {
      const engine = await BoatEngine.query()
        .select('id')
        .where('id', payload.boatEngineId)
        .where('boatId', boat.id)
        .first()

      if (!engine) {
        throw new BoatFuelLogValidationError(
          'Engine does not belong to this boat',
          'engineNotBelongs'
        )
      }
    }

    const fueledAt = toDateTime(payload.fueledAt)

    return await BoatFuelLog.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      boatEngineId: payload.boatEngineId ?? null,
      fueledAt,
      quantityLiters: String(payload.quantityLiters),
      pricePerLiter:
        payload.pricePerLiter !== null && payload.pricePerLiter !== undefined
          ? String(payload.pricePerLiter)
          : null,
      totalCost:
        payload.totalCost !== null && payload.totalCost !== undefined
          ? String(payload.totalCost)
          : null,
      engineHoursAtFueling:
        payload.engineHoursAtFueling !== null && payload.engineHoursAtFueling !== undefined
          ? String(payload.engineHoursAtFueling)
          : null,
      supplier: payload.supplier?.trim() || null,
      notes: payload.notes?.trim() || null,
    })
  }

  async deleteForBoat(user: User, boat: Boat, logId: number) {
    assertBoatScope(user, boat)

    const log = await BoatFuelLog.query().where('id', logId).where('boatId', boat.id).first()

    if (!log) throw new BoatFuelLogNotFoundError()
    await log.delete()
  }
}
