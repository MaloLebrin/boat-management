import type BoatEquipmentAction from '#models/boat_equipment_action'
import type {
  BoatEquipmentActionRow,
  EquipmentActionType,
  EquipmentActionStatus,
  EquipmentReferenceType,
} from '#shared/types/equipment_action'

export function toBoatEquipmentActionRow(action: BoatEquipmentAction): BoatEquipmentActionRow {
  return {
    id: action.id,
    boatId: action.boatId,
    actionType: action.actionType as EquipmentActionType,
    status: action.status as EquipmentActionStatus,
    label: action.label,
    notes: action.notes,
    estimatedCost: action.estimatedCost ? Number.parseFloat(action.estimatedCost) : null,
    actualCost: action.actualCost ? Number.parseFloat(action.actualCost) : null,
    equipmentType: action.equipmentType as EquipmentReferenceType | null,
    equipmentId: action.equipmentId,
    resolvedAt: action.resolvedAt ? action.resolvedAt.toISO()! : null,
    createdAt: action.createdAt.toISO()!,
    createdBy: action.createdBy,
  }
}
