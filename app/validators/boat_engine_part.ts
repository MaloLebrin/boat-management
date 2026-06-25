import vine from '@vinejs/vine'
import { PART_WEAR_STATES } from '#shared/types/boat'

function positiveIntOrNull() {
  return vine
    .string()
    .trim()
    .optional()
    .transform((s) => {
      if (s === undefined || s === '') return null
      const n = Number.parseInt(s, 10)
      if (!Number.isInteger(n) || n < 0) return null
      return n
    })
}

const partFields = {
  designation: vine.string().trim().minLength(1).maxLength(200),
  reference: vine.string().trim().maxLength(100).nullable().optional(),
  stock: positiveIntOrNull(),
  minStockAlert: positiveIntOrNull(),
  supplier: vine.string().trim().maxLength(200).nullable().optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  wearState: vine.enum(PART_WEAR_STATES).optional(),
  purchasePrice: vine.string().trim().optional(),
  purchasedAt: vine.string().trim().optional(),
}

export const createEnginePartValidator = vine.create(vine.object(partFields))

export const updateEnginePartValidator = vine.create(vine.object(partFields))
