import vine from '@vinejs/vine'

export const createNavigationLogValidator = vine.compile(
  vine.object({
    departedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss'] }),
    departurePortId: vine.number().withoutDecimals().positive().optional(),
    departurePortName: vine.string().trim().maxLength(255).optional(),
    engineHoursStart: vine.number().min(0).optional(),
    windForceBeaufort: vine.number().withoutDecimals().min(0).max(12).optional(),
    seaState: vine.enum(['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const).optional(),
    crewCount: vine.number().withoutDecimals().min(0).optional(),
    notes: vine.string().trim().maxLength(5000).optional(),
  })
)

export const closeNavigationLogValidator = vine.compile(
  vine.object({
    arrivedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss'] }),
    arrivalPortId: vine.number().withoutDecimals().positive().optional(),
    arrivalPortName: vine.string().trim().maxLength(255).optional(),
    distanceNm: vine.number().min(0).optional(),
    engineHoursEnd: vine.number().min(0).optional(),
    fuelConsumedLiters: vine.number().min(0).optional(),
    windForceBeaufort: vine.number().withoutDecimals().min(0).max(12).optional(),
    seaState: vine.enum(['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const).optional(),
    crewCount: vine.number().withoutDecimals().min(0).optional(),
    notes: vine.string().trim().maxLength(5000).optional(),
  })
)
