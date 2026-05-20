import vine from '@vinejs/vine'

export const createSpotValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100),
    description: vine.string().trim().maxLength(500).nullable().optional(),
  })
)

export const updateSpotValidator = createSpotValidator
