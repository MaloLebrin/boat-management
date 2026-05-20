import vine from '@vinejs/vine'

export const createEnginePartValidator = vine.create(
  vine.object({
    designation: vine.string().trim().minLength(1).maxLength(200),
    reference: vine.string().trim().maxLength(100).nullable().optional(),
    stock: vine
      .string()
      .trim()
      .optional()
      .transform((s) => {
        if (s === undefined || s === '') return null
        const n = Number.parseInt(s, 10)
        if (!Number.isInteger(n) || n < 0) return null
        return n
      }),
    supplier: vine.string().trim().maxLength(200).nullable().optional(),
    notes: vine.string().trim().maxLength(2000).nullable().optional(),
  })
)

export const updateEnginePartValidator = vine.create(
  vine.object({
    designation: vine.string().trim().minLength(1).maxLength(200),
    reference: vine.string().trim().maxLength(100).nullable().optional(),
    stock: vine
      .string()
      .trim()
      .optional()
      .transform((s) => {
        if (s === undefined || s === '') return null
        const n = Number.parseInt(s, 10)
        if (!Number.isInteger(n) || n < 0) return null
        return n
      }),
    supplier: vine.string().trim().maxLength(200).nullable().optional(),
    notes: vine.string().trim().maxLength(2000).nullable().optional(),
  })
)
