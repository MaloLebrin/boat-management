import vine from '@vinejs/vine'

const actionTypeChoices = ['to_buy', 'to_replace', 'to_repair'] as const

const statusChoices = ['pending', 'ordered', 'done', 'cancelled'] as const

const equipmentTypeChoices = ['generic', 'safety', 'engine', 'sail', 'rig'] as const

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
