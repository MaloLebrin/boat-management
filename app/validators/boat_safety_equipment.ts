import vine from '@vinejs/vine'
import { safetyEquipmentStatuses, safetyEquipmentTypes } from '#validators/boat'

export const createSafetyEquipmentValidator = vine.create(
  vine.object({
    equipmentType: vine.enum(safetyEquipmentTypes),
    quantity: vine.number().withoutDecimals().positive().nullable().optional(),
    expiryDate: vine.date().nullable().optional(),
    status: vine.enum(safetyEquipmentStatuses).optional(),
    notes: vine.string().trim().nullable().optional(),
    purchasePrice: vine.string().trim().nullable().optional(),
    purchasedAt: vine.string().trim().optional(),
  })
)

export const updateSafetyEquipmentValidator = vine.create(
  vine.object({
    equipmentType: vine.enum(safetyEquipmentTypes),
    quantity: vine.number().withoutDecimals().positive().nullable().optional(),
    expiryDate: vine.date().nullable().optional(),
    status: vine.enum(safetyEquipmentStatuses).optional(),
    notes: vine.string().trim().nullable().optional(),
    purchasePrice: vine.string().trim().nullable().optional(),
    purchasedAt: vine.string().trim().optional(),
  })
)
