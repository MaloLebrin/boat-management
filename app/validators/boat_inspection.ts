import vine from '@vinejs/vine'

const inspectionKindChoices = ['checkout', 'checkin'] as const

export const createBoatInspectionValidator = vine.create(
  vine.object({
    kind: vine.enum(inspectionKindChoices),
    performedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    fuelLevel: vine.number().min(0).max(100).optional(),
    engineHours: vine.number().min(0).optional(),
    notes: vine.string().trim().optional(),
  })
)

export const updateBoatInspectionValidator = vine.create(
  vine.object({
    performedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }).optional(),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    fuelLevel: vine.number().min(0).max(100).optional(),
    engineHours: vine.number().min(0).optional(),
    notes: vine.string().trim().optional(),
  })
)
