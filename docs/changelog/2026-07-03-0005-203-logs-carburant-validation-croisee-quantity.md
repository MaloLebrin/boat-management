# 2026-07-03 — [#203] Logs carburant : validation croisée quantity/pricePerLiter/totalCost

**Corrige D-09 : le validator acceptait `totalCost` incohérent avec `quantityLiters * pricePerLiter` sans contrôle**

- `app/services/boat_fuel_log_service.ts` : `createForBoat()` vérifie désormais, quand `pricePerLiter` et `totalCost` sont tous deux fournis, que `Math.abs(totalCost - quantityLiters * pricePerLiter) < 0.01` ; sinon `BoatFuelLogValidationError('inconsistentCost')`
- `resources/lang/{fr,en}/flash.json` : clé `fuelLog.inconsistentCost` ajoutée
- Tests ajoutés : `tests/functional/boats/fuel_logs.spec.ts` (rejet si incohérent, acceptation dans la tolérance d'arrondi)
