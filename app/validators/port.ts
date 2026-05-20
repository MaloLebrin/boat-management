import vine from '@vinejs/vine'

export const createPortValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    city: vine.string().trim().maxLength(120).nullable().optional(),
    country: vine.string().trim().maxLength(8).nullable().optional(),
    address: vine.string().trim().nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
  })
)

export const updatePortValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    city: vine.string().trim().maxLength(120).nullable().optional(),
    country: vine.string().trim().maxLength(8).nullable().optional(),
    address: vine.string().trim().nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
  })
)
