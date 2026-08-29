import vine from '@vinejs/vine'
import { ENGINE_FUELS } from '#shared/constants/boats/boat_form_options'

export const createBoatFuelLogValidator = vine.create(
  vine.object({
    fueledAt: vine.date({ formats: ['YYYY-MM-DD'] }),
    quantityLiters: vine.number().positive(),
    pricePerLiter: vine.number().positive().optional(),
    totalCost: vine.number().positive().optional(),
    engineHoursAtFueling: vine.number().min(0).optional(),
    boatEngineId: vine.number().withoutDecimals().positive().optional(),
    // Carburant avitaillé (#585) — même vocabulaire que `boat_engines.fuel`.
    fuelType: vine.enum(ENGINE_FUELS).optional().nullable(),
    supplier: vine.string().trim().maxLength(500).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
  })
)
