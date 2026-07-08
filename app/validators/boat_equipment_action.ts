import vine from '@vinejs/vine'
import {
  EQUIPMENT_ACTION_STATUSES as statusChoices,
  EQUIPMENT_ACTION_TYPES as actionTypeChoices,
  EQUIPMENT_REFERENCE_TYPES as equipmentTypeChoices,
} from '#shared/constants/equipment_action'

export const createBoatEquipmentActionValidator = vine.create(
  vine.object({
    label: vine.string().trim().minLength(1),
    actionType: vine.enum(actionTypeChoices),
    notes: vine.string().trim().optional(),
    estimatedCost: vine.number().positive().optional(),
    equipmentType: vine.enum(equipmentTypeChoices).optional(),
    equipmentId: vine.number().withoutDecimals().positive().optional(),
  })
)

export const updateBoatEquipmentActionValidator = vine.create(
  vine.object({
    label: vine.string().trim().minLength(1).optional(),
    actionType: vine.enum(actionTypeChoices).optional(),
    notes: vine.string().trim().optional(),
    estimatedCost: vine.number().positive().optional(),
    actualCost: vine.number().positive().optional(),
    equipmentType: vine.enum(equipmentTypeChoices).optional(),
    equipmentId: vine.number().withoutDecimals().positive().optional(),
    status: vine.enum(statusChoices).optional(),
  })
)
