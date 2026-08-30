import type Boat from '#models/boat'
import type BoatEngine from '#models/boat_engine'
import type { DiagnosticEngineRow } from '#shared/types/diagnostic'
import type { EngineFamily } from '#shared/types/engine_catalog'

/**
 * Ligne moteur de la page index « Panne ».
 *
 * La progression est passée par l'appelant plutôt que recalculée ici : elle
 * dépend de la checklist globale de la **famille** du moteur (#576), que le
 * service résout une fois pour toute la liste.
 */
export function toDiagnosticEngineRow(
  engine: BoatEngine,
  boat: Pick<Boat, 'id' | 'name'>,
  progress: { checkedCount: number; totalSteps: number; family: EngineFamily | null }
): DiagnosticEngineRow {
  return {
    id: engine.id,
    boatId: boat.id,
    boatName: boat.name,
    brand: engine.brand,
    model: engine.model,
    serialNumber: engine.serialNumber,
    kind: engine.kind,
    family: progress.family,
    status: engine.status,
    checkedCount: progress.checkedCount,
    totalSteps: progress.totalSteps,
  }
}
