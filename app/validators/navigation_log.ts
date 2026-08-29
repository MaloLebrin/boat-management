import vine from '@vinejs/vine'

export const createNavigationLogValidator = vine.create(
  vine.object({
    departedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss'] }),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC (#452)
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
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

export const createNavigationLogEntryValidator = vine.create(
  vine.object({
    recordedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss'] }),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC (#452)
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    latitude: vine.number().min(-90).max(90).nullable().optional(),
    longitude: vine.number().min(-180).max(180).nullable().optional(),
    gpsAccuracyM: vine.number().min(0).nullable().optional(),
    cogDeg: vine.number().withoutDecimals().min(0).max(359).nullable().optional(),
    sogKn: vine.number().min(0).max(99).nullable().optional(),
    sailConfig: vine.string().trim().maxLength(255).nullable().optional(),
    note: vine.string().trim().maxLength(2000).nullable().optional(),
  })
)

export const updateNavigationLogEntryValidator = vine.create(
  vine.object({
    recordedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss'] }).optional(),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC (#452)
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    // nullable + optional: an absent field is left untouched (preserve), while an
    // explicit null (an emptied form field) clears the value. See #180.
    latitude: vine.number().min(-90).max(90).nullable().optional(),
    longitude: vine.number().min(-180).max(180).nullable().optional(),
    gpsAccuracyM: vine.number().min(0).nullable().optional(),
    cogDeg: vine.number().withoutDecimals().min(0).max(359).nullable().optional(),
    sogKn: vine.number().min(0).max(99).nullable().optional(),
    sailConfig: vine.string().trim().maxLength(255).nullable().optional(),
    note: vine.string().trim().maxLength(2000).nullable().optional(),
  })
)

export const closeNavigationLogValidator = vine.create(
  vine.object({
    _expectedUpdatedAt: vine.string().optional(),
    arrivedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DDTHH:mm:ss'] }),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC (#452)
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    arrivalPortId: vine.number().withoutDecimals().positive().optional(),
    arrivalPortName: vine.string().trim().maxLength(255).optional(),
    distanceNm: vine.number().min(0).optional(),
    engineHoursEnd: vine.number().min(0).optional(),
    boatEngineId: vine.number().withoutDecimals().positive().nullable().optional(),
    fuelConsumedLiters: vine.number().min(0).optional(),
    windForceBeaufort: vine.number().withoutDecimals().min(0).max(12).optional(),
    seaState: vine.enum(['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const).optional(),
    crewCount: vine.number().withoutDecimals().min(0).optional(),
    notes: vine.string().trim().maxLength(5000).optional(),
  })
)
