import type BoatInspection from '#models/boat_inspection'
import type BoatInspectionItem from '#models/boat_inspection_item'
import type {
  BoatInspectionItemRow,
  BoatInspectionRow,
  InspectionItemState,
  InspectionKind,
} from '#shared/types/inspection'

export function toBoatInspectionRow(inspection: BoatInspection): BoatInspectionRow {
  return {
    id: inspection.id,
    reservationId: inspection.reservationId,
    kind: inspection.kind as InspectionKind,
    performedAt: inspection.performedAt.toISO()!,
    fuelLevel: inspection.fuelLevel,
    engineHours: inspection.engineHours,
    notes: inspection.notes,
    createdAt: inspection.createdAt.toISO()!,
  }
}

export function toBoatInspectionItemRow(item: BoatInspectionItem): BoatInspectionItemRow {
  return {
    id: item.id,
    itemKey: item.itemKey,
    state: item.state as InspectionItemState,
    note: item.note,
  }
}
