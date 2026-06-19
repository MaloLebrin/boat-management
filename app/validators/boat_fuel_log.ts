import vine from '@vinejs/vine'

export const createBoatFuelLogValidator = vine.create(
  vine.object({
    fueledAt: vine.date({ formats: ['YYYY-MM-DD'] }),
    quantityLiters: vine.number().positive(),
    pricePerLiter: vine.number().positive().optional(),
    totalCost: vine.number().positive().optional(),
    engineHoursAtFueling: vine.number().min(0).optional(),
    boatEngineId: vine.number().withoutDecimals().positive().optional(),
    supplier: vine.string().trim().optional(),
    notes: vine.string().trim().optional(),
  })
)
