import type Boat from '#models/boat'
import type BoatEngine from '#models/boat_engine'
import type { DiagnosticEngineRow } from '#shared/types/diagnostic'

export function toDiagnosticEngineRow(
  engine: BoatEngine,
  boat: Pick<Boat, 'id' | 'name'>,
  checkedCount: number
): DiagnosticEngineRow {
  return {
    id: engine.id,
    boatId: boat.id,
    boatName: boat.name,
    brand: engine.brand,
    model: engine.model,
    kind: engine.kind,
    status: engine.status,
    checkedCount,
  }
}
