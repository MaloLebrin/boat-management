import vine from '@vinejs/vine'

export const createNavigationLogValidator = vine.create(
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

export const updateNavigationLogValidator = vine.create(
  vine.object({
    _expectedUpdatedAt: vine.string().optional(),
    // nullable + optional: an absent field is left untouched (preserve), while an
    // explicit null (an emptied form field) clears the value. See #180.
    windForceBeaufort: vine.number().withoutDecimals().min(0).max(12).nullable().optional(),
    seaState: vine
      .enum(['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const)
      .nullable()
      .optional(),
    crewCount: vine.number().withoutDecimals().min(0).nullable().optional(),
    notes: vine.string().trim().maxLength(5000).nullable().optional(),
  })
)

export const closeNavigationLogValidator = vine.create(
  vine.object({
    _expectedUpdatedAt: vine.string().optional(),
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
