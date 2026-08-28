import type Boat from '#models/boat'
import type BoatEngine from '#models/boat_engine'
import type BoatEngineRepairCartItem from '#models/boat_engine_repair_cart_item'
import type { RepairCartItemRow, SparePartsEngineRow } from '#shared/types/spare_parts'

export function toSparePartsEngineRow(
  engine: BoatEngine,
  boat: Pick<Boat, 'id' | 'name'>,
  cartCount: number
): SparePartsEngineRow {
  return {
    id: engine.id,
    boatId: boat.id,
    boatName: boat.name,
    brand: engine.brand,
    model: engine.model,
    kind: engine.kind,
    status: engine.status,
    cartCount,
  }
}

export function toRepairCartItemRow(item: BoatEngineRepairCartItem): RepairCartItemRow {
  return {
    id: item.id,
    partKey: item.partKey,
    quantity: item.quantity,
    reference: item.reference,
  }
}
