import vine from '@vinejs/vine'

export const updatePositionValidator = vine.compile(
  vine.object({
    x: vine.number(),
    y: vine.number(),
  })
)

export const assignBoatValidator = vine.compile(
  vine.object({
    pontoonId: vine.number().nullable().optional(),
    mouillageId: vine.number().nullable().optional(),
    spotIdentifier: vine.string().trim().maxLength(16).nullable().optional(),
  })
)
