import { BoatFuelLogNotFoundError, BoatFuelLogValidationError } from '#exceptions/fuel_log_errors'
import BoatEngine from '#models/boat_engine'
import BoatFuelLog from '#models/boat_fuel_log'
import type Boat from '#models/boat'
import type User from '#models/user'
import type { CreateFuelLogPayload } from '#shared/types/fuel_log'
import { toDateTime } from '#shared/helpers/date'

export { BoatFuelLogNotFoundError, BoatFuelLogValidationError }
export type { CreateFuelLogPayload }

export default class BoatFuelLogService {
  async listForBoat(_user: User, boat: Boat) {
    return await BoatFuelLog.query()
      .where('boatId', boat.id)
      .orderBy('fueledAt', 'desc')
      .orderBy('id', 'desc')
  }

  async createForBoat(_user: User, boat: Boat, payload: CreateFuelLogPayload) {
    let engineFuel: string | null = null

    if (payload.boatEngineId) {
      const engine = await BoatEngine.query()
        .select('id', 'fuel')
        .where('id', payload.boatEngineId)
        .where('boatId', boat.id)
        .first()

      if (!engine) {
        throw new BoatFuelLogValidationError(
          'Engine does not belong to this boat',
          'engineNotBelongs'
        )
      }

      engineFuel = engine.fuel
    }

    if (
      payload.pricePerLiter !== null &&
      payload.pricePerLiter !== undefined &&
      payload.totalCost !== null &&
      payload.totalCost !== undefined
    ) {
      const expectedTotalCost = payload.quantityLiters * payload.pricePerLiter
      if (Math.abs(payload.totalCost - expectedTotalCost) >= 0.01) {
        throw new BoatFuelLogValidationError(
          'Total cost is inconsistent with quantity and price per liter',
          'inconsistentCost'
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
      // Le formulaire pré-remplit déjà le carburant depuis le moteur choisi ;
      // ce repli couvre les envois qui ne passent pas par lui (file d'attente
      // hors-ligne, import). Un carburant explicite n'est jamais écrasé (#585).
      fuelType: payload.fuelType ?? engineFuel,
      supplier: payload.supplier?.trim() || null,
      notes: payload.notes?.trim() || null,
    })
  }

  async deleteForBoat(_user: User, boat: Boat, logId: number) {
    const log = await BoatFuelLog.query().where('id', logId).where('boatId', boat.id).first()

    if (!log) throw new BoatFuelLogNotFoundError()
    await log.delete()
  }
}
