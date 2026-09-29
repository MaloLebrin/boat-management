import type BoatInspection from '#models/boat_inspection'
import type BoatInspectionItem from '#models/boat_inspection_item'
import type {
  BoatInspectionItemRow,
  BoatInspectionRow,
  InspectionItemState,
  InspectionKind,
  InspectionSignatureRole,
  InspectionSignatureSummary,
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
    updatedAt: inspection.updatedAt?.toISO() ?? inspection.createdAt.toISO()!,
    lockedAt: inspection.lockedAt?.toISO() ?? null,
    sentAt: inspection.sentAt?.toISO() ?? null,
    // Relation préchargée par `listForReservation` (sans le tracé) ; absente
    // ailleurs, la liste reste vide.
    signatures: (inspection.$preloaded.signatures ? inspection.signatures : []).map(
      (signature): InspectionSignatureSummary => ({
        role: signature.role as InspectionSignatureRole,
        signerName: signature.signerName,
        signedAt: signature.signedAt.toISO()!,
      })
    ),
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
