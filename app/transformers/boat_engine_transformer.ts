import type BoatEngine from '#models/boat_engine'

export function toBoatEngineDetail(engine: BoatEngine) {
  return {
    id: engine.id,
    boatId: engine.boatId,
    kind: engine.kind,
    fuel: engine.fuel,
    brand: engine.brand,
    model: engine.model,
    serialNumber: engine.serialNumber,
    manufacturedAt: engine.manufacturedAt ? engine.manufacturedAt.toISODate() : null,
    powerHp: engine.powerHp,
    powerKw: engine.powerKw,
    hours: engine.hours,
    installHours: engine.installHours,
    strokeType: engine.strokeType,
    status: engine.status,
    notes: engine.notes,
    parts: (engine.parts ?? []).map((p) => ({
      id: p.id,
      designation: p.designation,
      reference: p.reference,
      supplier: p.supplier,
      stock: p.stock,
      minStockAlert: p.minStockAlert,
      wearState: p.wearState,
      notes: p.notes,
    })),
    createdAt: engine.createdAt.toISO(),
    updatedAt: engine.updatedAt?.toISO() ?? null,
  }
}
