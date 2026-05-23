import vine from '@vinejs/vine'

export const checkoutValidator = vine.compile(
  vine.object({
    planTier: vine.enum(['pro', 'enterprise'] as const),
    interval: vine.enum(['month', 'year'] as const),
  })
)
