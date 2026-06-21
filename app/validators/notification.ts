import vine from '@vinejs/vine'

export const notificationPageValidator = vine.compile(
  vine.object({
    page: vine.number().withoutDecimals().min(1).optional(),
  })
)
