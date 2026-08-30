import { isEngineFamily } from '#shared/types/engine_catalog'
import type { EngineListItem, EngineSerializedRow } from '#shared/types/engine'

/** Parse un numérique Lucid, qui peut remonter en `string` selon le driver. */
function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Projection d'un moteur vers l'inventaire transverse (#598).
 *
 * `boat_engines` ne porte pas d'`organizationId` : le nom du bateau ne vient
 * donc pas de la ligne mais du référentiel des bateaux de l'organisation déjà
 * chargé par le service, ce qui évite un `preload` par ligne paginée.
 */
export function toEngineListItem(row: EngineSerializedRow, boatName: string): EngineListItem {
  return {
    id: Number(row.id),
    boatId: Number(row.boatId),
    boatName,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serialNumber,
    kind: row.kind,
    fuel: row.fuel,
    family: isEngineFamily(row.family) ? row.family : null,
    status: row.status,
    powerHp: toNumberOrNull(row.powerHp),
    hours: toNumberOrNull(row.hours),
    updatedAt: row.updatedAt ?? null,
  }
}
