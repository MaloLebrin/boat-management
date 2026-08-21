# 2026-07-03 — [#198] Équipements : purchasePrice validé comme nombre décimal positif

**Corrige B-07 : `purchasePrice` était déclaré `vine.string().trim()` dans trois validators alors que la colonne DB est `decimal(10, 2)` — les valeurs `"-500"`, `"abc"` ou `"3.14.15"` passaient la validation et pouvaient corrompre la base**

- `app/validators/boat_safety_equipment.ts`, `app/validators/boat_generic_equipment.ts`, `app/validators/boat_engine_part.ts` : `purchasePrice` utilise désormais `vine.number().positive().decimal([0, 2]).nullable().optional()`
- `shared/types/boat.ts` : `purchasePrice` passe de `string | null` à `number | null` dans `BoatSafetyEquipmentPayload`, `BoatGenericEquipmentPayload` et `BoatEnginePartPayload`
- `app/utils/boat_utils.ts` : nouvel helper `toDecimalStringOrNull()` pour convertir le nombre validé en chaîne décimale avant stockage (colonne `decimal` mappée en `string` côté Lucid)
- `app/services/boat_safety_equipment_service.ts`, `app/services/boat_generic_equipment_service.ts`, `app/services/boat_engine_part_service.ts` : utilisation de `toDecimalStringOrNull()` en création et mise à jour
- Test ajouté : `tests/functional/boats/equipment_purchase_price.spec.ts` (rejet des valeurs négatives/non-numériques, acceptation des valeurs valides, pour les trois routes)
