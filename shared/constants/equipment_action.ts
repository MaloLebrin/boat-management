export const EQUIPMENT_ACTION_TYPES = ['to_buy', 'to_replace', 'to_repair'] as const

export type EquipmentActionType = (typeof EQUIPMENT_ACTION_TYPES)[number]

export const EQUIPMENT_ACTION_STATUSES = ['pending', 'ordered', 'done', 'cancelled'] as const

export type EquipmentActionStatus = (typeof EQUIPMENT_ACTION_STATUSES)[number]

export const EQUIPMENT_REFERENCE_TYPES = ['generic', 'safety', 'engine', 'sail', 'rig'] as const

export type EquipmentReferenceType = (typeof EQUIPMENT_REFERENCE_TYPES)[number]
