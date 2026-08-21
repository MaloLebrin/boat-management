# 2026-06-01 — Gestion avancée des pièces et suivi des coûts de maintenance

**Nouvelles fonctionnalités**

## Liaison pièces de maintenance → catalogue moteur

- Champ `engine_part_id` (FK nullable) ajouté sur `boat_maintenance_parts` → lien vers `boat_engine_parts`
- Relation `belongsTo` ajoutée dans `BoatMaintenancePart` → `BoatEnginePart`
- Champ `enginePartId` accepté dans le payload `parts[]` du formulaire de création d'événement de maintenance
- Lors de la création d'un événement, si une pièce référence une pièce du catalogue :
  - Le stock est décrémenté automatiquement (en transaction)
  - Si le stock atteint 0, le `wearState` passe à `to_replace` (sauf si `damaged`)

## Suivi des coûts de maintenance

- Champ `unit_price` (decimal 10,2) ajouté sur `boat_maintenance_parts`
- Champ `unitPrice` accepté dans le payload `parts[]`
- `getHistoryForOrg` retourne `totalCost` par événement et dans les statistiques globales
- Type `MaintenanceEventPartRow` et `MaintenanceEventRow` ajoutés dans `shared/types/maintenance.ts`
- Clés i18n ajoutées : `maintenance.history.stats.totalCost`, `maintenance.history.timeline.totalCost/unitPrice/fromCatalog` (EN + FR)

## Seuil d'alerte de stock minimum sur les pièces moteur

- Champ `min_stock_alert` (int nullable) ajouté sur `boat_engine_parts`
- Champ `minStockAlert` accepté dans les payloads create/update de pièce moteur
- Méthode `BoatEnginePartService.listLowStock(engineId)` : retourne les pièces dont `stock ≤ min_stock_alert`
- Clés i18n ajoutées : `equipment.stock.minStockAlert/minStockAlertPlaceholder/lowStockWarning` (EN + FR)
- Type `LowStockPartRow` ajouté dans `shared/types/boat.ts`

**Migrations ajoutées**

- `1779200000000_link_maintenance_parts_to_engine_parts.ts` — FK `engine_part_id` sur `boat_maintenance_parts`
- `1779300000000_add_cost_to_maintenance_parts.ts` — colonne `unit_price` sur `boat_maintenance_parts`
- `1779400000000_add_min_stock_alert_to_engine_parts.ts` — colonne `min_stock_alert` sur `boat_engine_parts`

**Tests ajoutés**

- `tests/unit/boat_maintenance_service.spec.ts` : 3 nouveaux cas (décrément stock, wearState auto, totalCost)
- `tests/unit/boat_engine_part_service.spec.ts` : 4 cas (create avec minStockAlert, listLowStock, update)
