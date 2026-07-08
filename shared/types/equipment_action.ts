export type EquipmentActionType = 'to_buy' | 'to_replace' | 'to_repair'

export type EquipmentActionStatus = 'pending' | 'ordered' | 'done' | 'cancelled'

export type EquipmentReferenceType = 'generic' | 'safety' | 'engine' | 'sail' | 'rig'

export type CreateEquipmentActionPayload = {
  label: string
  actionType: EquipmentActionType
  notes?: string | null
  estimatedCost?: number | null
  equipmentType?: EquipmentReferenceType | null
  equipmentId?: number | null
}

export type UpdateEquipmentActionPayload = {
  label?: string
  actionType?: EquipmentActionType
  notes?: string | null
  estimatedCost?: number | null
  actualCost?: number | null
  equipmentType?: EquipmentReferenceType | null
  equipmentId?: number | null
  status?: EquipmentActionStatus
}

export type BoatEquipmentActionRow = {
  id: number
  boatId: number
  actionType: EquipmentActionType
  status: EquipmentActionStatus
  label: string
  notes: string | null
  estimatedCost: number | null
  actualCost: number | null
  equipmentType: EquipmentReferenceType | null
  equipmentId: number | null
  /** Set when the action was raised from a rental inspection (#311). */
  inspectionId: number | null
  resolvedAt: string | null
  createdAt: string
  createdBy: number
}
