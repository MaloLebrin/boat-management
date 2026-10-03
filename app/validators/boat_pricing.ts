import vine from '@vinejs/vine'
import { SUPPORTED_CURRENCIES } from '#shared/types/currency'

export const upsertBoatPricingValidator = vine.compile(
  vine.object({
    baseDailyPrice: vine.number().min(0),
    baseWeeklyPrice: vine.number().min(0).nullable().optional(),
    depositAmount: vine.number().min(0).nullable().optional(),
    minDays: vine.number().min(1).nullable().optional(),
    maxDays: vine.number().min(1).nullable().optional(),
    currency: vine.enum(SUPPORTED_CURRENCIES).optional(),
  })
)
