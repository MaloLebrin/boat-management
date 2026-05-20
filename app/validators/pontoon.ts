import vine from '@vinejs/vine'

export const createPontoonValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    description: vine.string().trim().nullable().optional(),
  })
)

export const updatePontoonValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    description: vine.string().trim().nullable().optional(),
  })
)
