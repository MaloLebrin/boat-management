import vine from '@vinejs/vine'

export const notificationPageValidator = vine.compile(
  vine.object({
    page: vine.number().withoutDecimals().min(1).optional(),
  })
)

export const notificationIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals().min(1),
  })
)
