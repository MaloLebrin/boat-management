import vine from '@vinejs/vine'

export const upsertBoatPricingValidator = vine.compile(
  vine.object({
    baseDailyPrice: vine.number().min(0),
    baseWeeklyPrice: vine.number().min(0).nullable().optional(),
    depositAmount: vine.number().min(0).nullable().optional(),
    minDays: vine.number().min(1).nullable().optional(),
    maxDays: vine.number().min(1).nullable().optional(),
    currency: vine.string().trim().fixedLength(3).optional(),
  })
)
