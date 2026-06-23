import vine from '@vinejs/vine'
import { GENERIC_EQUIPMENT_CATEGORIES } from '#shared/types/boat'

export const createGenericEquipmentValidator = vine.create(
  vine.object({
    category: vine.enum(GENERIC_EQUIPMENT_CATEGORIES),
    name: vine.string().trim().minLength(1).maxLength(200),
    brand: vine.string().trim().nullable().optional(),
    model: vine.string().trim().nullable().optional(),
    quantity: vine.number().withoutDecimals().positive().nullable().optional(),
    status: vine.enum(['ok', 'to_check', 'to_replace']).optional(),
    notes: vine.string().trim().nullable().optional(),
  })
)

export const updateGenericEquipmentValidator = vine.create(
  vine.object({
    category: vine.enum(GENERIC_EQUIPMENT_CATEGORIES),
    name: vine.string().trim().minLength(1).maxLength(200),
    brand: vine.string().trim().nullable().optional(),
    model: vine.string().trim().nullable().optional(),
    quantity: vine.number().withoutDecimals().positive().nullable().optional(),
    status: vine.enum(['ok', 'to_check', 'to_replace']).optional(),
    notes: vine.string().trim().nullable().optional(),
  })
)
