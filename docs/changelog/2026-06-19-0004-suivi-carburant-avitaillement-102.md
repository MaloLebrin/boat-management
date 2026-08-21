# 2026-06-19 — Suivi carburant / avitaillement #102

**Backend**

- `database/migrations/1797000000000_create_fuel_logs_table.ts` — table `fuel_logs` : `boat_id` (FK CASCADE), `organization_id` (FK CASCADE), `boat_engine_id` (FK SET NULL, nullable), `fueled_at` (date), `quantity_liters` decimal(10,3), `price_per_liter` decimal(10,4) nullable, `total_cost` decimal(10,2) nullable, `engine_hours_at_fueling` decimal(10,1) nullable, `supplier` string nullable, `notes` text nullable
- `app/models/boat_fuel_log.ts` — modèle Lucid avec relations `belongsTo(Boat)` et `belongsTo(BoatEngine)`
- `app/exceptions/fuel_log_errors.ts` — `BoatFuelLogNotFoundError`, `BoatFuelLogValidationError`
- `shared/types/fuel_log.ts` — types `CreateFuelLogPayload`, `FuelLogRow`
- `app/validators/boat_fuel_log.ts` — `createBoatFuelLogValidator`
- `app/policies/fuel_log_policy.ts` — policy Bouncer : `create` autorisé aux membres de l'organisation, `delete` réservé aux admins via `before()`
- `app/services/boat_fuel_log_service.ts` — `listForBoat`, `createForBoat` (validation appartenance moteur), `deleteForBoat`
- `app/controllers/boat_fuel_logs_controller.ts` — `store`, `destroy` ; réponses par redirection vers `?tab=fuel`
- `start/routes/boats.ts` — routes `POST /boats/:boatId/fuel-logs`, `DELETE /boats/:boatId/fuel-logs/:logId`
- `app/controllers/boats_controller.ts` — injection de `BoatFuelLogService`, chargement des fuel logs + `canDeleteFuelLogs` dans `show`
- `app/transformers/boat_transformer.ts` — `toFuelLog()` + `canDeleteFuelLogs` dans `toShowProps()`
- `resources/lang/fr/flash.json` et `resources/lang/en/flash.json` — clés `fuelLog.*`

**Frontend**

- `resources/lang/fr/fuel_logs.json` et `resources/lang/en/fuel_logs.json` — toutes les clés UI du module
- `inertia/types/boat_show.ts` — re-export de `FuelLogRow`
- `inertia/components/boats/show/tabs/BoatShowTabFuelLogs.vue` — onglet carburant : liste des avitaillements avec date, quantité, coût, moteur, heures moteur, fournisseur, notes ; compteur total litres
- `inertia/components/boats/show/tabs/BoatFuelLogForm.vue` — formulaire de création d'avitaillement
- `inertia/pages/boats/show.vue` — ajout de l'onglet "Carburant" avec props `fuelLogs` et `canDeleteFuelLogs`
