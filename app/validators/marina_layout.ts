import vine from '@vinejs/vine'

export const updatePositionValidator = vine.create(
  vine.object({
    x: vine.number(),
    y: vine.number(),
  })
)

export const assignBoatValidator = vine.create(
  vine.object({
    spotId: vine.number().nullable(),
  })
)
