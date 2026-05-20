import vine from '@vinejs/vine'

export const createMouillageValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    description: vine.string().trim().nullable().optional(),
  })
)

export const updateMouillageValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    description: vine.string().trim().nullable().optional(),
  })
)
