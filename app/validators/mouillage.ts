import vine from '@vinejs/vine'

export const createMouillageValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    description: vine.string().trim().nullable().optional(),
  })
)

export const updateMouillageValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    description: vine.string().trim().nullable().optional(),
  })
)
