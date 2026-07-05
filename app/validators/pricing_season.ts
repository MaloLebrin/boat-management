import vine from '@vinejs/vine'

export const createPricingSeasonValidator = vine.create(
  vine.object({
    boatId: vine.number().positive().nullable().optional(),
    name: vine.string().trim().minLength(1).maxLength(120),
    startsOn: vine.date({ formats: ['YYYY-MM-DD'] }),
    endsOn: vine.date({ formats: ['YYYY-MM-DD'] }),
    dailyPrice: vine.number().min(0).nullable().optional(),
    multiplier: vine.number().min(0).nullable().optional(),
    priority: vine.number().min(0).optional(),
  })
)

export const updatePricingSeasonValidator = vine.create(
  vine.object({
    boatId: vine.number().positive().nullable().optional(),
    name: vine.string().trim().minLength(1).maxLength(120),
    startsOn: vine.date({ formats: ['YYYY-MM-DD'] }),
    endsOn: vine.date({ formats: ['YYYY-MM-DD'] }),
    dailyPrice: vine.number().min(0).nullable().optional(),
    multiplier: vine.number().min(0).nullable().optional(),
    priority: vine.number().min(0).optional(),
  })
)
