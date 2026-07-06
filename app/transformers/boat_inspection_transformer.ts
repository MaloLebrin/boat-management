import type BoatInspection from '#models/boat_inspection'
import type { BoatInspectionRow, InspectionKind } from '#shared/types/inspection'

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
