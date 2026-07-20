# Données — schéma & relations

Source: `database/schema.ts` (généré automatiquement via migrations).

## Entités

### organizations

- `id`
- `name`, `slug`

### users

- `id`
- `email`
- `password` (non sérialisé)
- `fullName`
- `organizationId` (nullable)

### boats

- `id`
- `organizationId`
- identité: `name`, `registrationNumber`, `type`
- propulsion/specs: `propulsionType`, `lengthM`, `beamM`, `draftM`, `mastHeightM`
- matériaux: `hullMaterial`
- construction: `yearBuilt`, `manufacturer`, `model`, `manufacturedAt`

### boat_engines

- `id`, `boatId`
- `kind`
- détails: `fuel`, `brand`, `model`, `serialNumber`
- puissance: `powerHp`, `powerKw`
- `hours`
- `manufacturedAt`

### boat_sails

- `id`, `boatId`
- `sailType`
- `areaM2`, `material`, `reefPoints`
- `manufacturedAt`

### boat_rigs

- `id`, `boatId`
- `rigType`
- `mastCount`, `spreaders`
- `manufacturedAt`

### boat_maintenance_events (historique)

- `id`, `boatId`
- `subject`: `boat | engine | sail | rig`
- `performedAt`
- `title`, `notes`
- cibles optionnelles:
  - `boatEngineId`, `engineCaption`
  - `boatSailId`, `sailCaption`
  - `boatRigId`
- `dueAt` (présent au schéma; usage fonctionnel à confirmer par l’historique de migrations)

### boat_maintenance_parts

- `id`, `maintenanceEventId`
- `name`, `quantity`, `notes`

### boat_maintenance_tasks (planifié)

- `id`, `boatId`
- `subject`: `boat | engine | sail | rig`
- `status`: `open | done`
- cibles optionnelles:
  - `boatEngineId`, `boatSailId`, `boatRigId`
- contenu: `title`, `notes`
- planification:
  - `dueAt` (date)
  - `dueEngineHours` (int)
- complétion:
  - `doneAt`
  - `doneEngineHours`
  - `lastDoneEngineHours`
- récurrence:
  - `recurrenceIntervalMonths`
  - `recurrenceIntervalEngineHours`

### boat_equipment_actions

- `id`, `boatId`, `organizationId`
- `actionType`: `to_buy | to_replace | to_repair`
- `status`: `pending | ordered | done | cancelled`
- `label` (requis)
- `notes` (nullable)
- `estimatedCost`, `actualCost` (decimal 10,2, nullable)
- référence polymorphe: `equipmentType` (`generic | safety | engine | sail | rig`), `equipmentId`
- `inspectionId` (FK nullable, réservé usage futur)
- `createdBy` (FK users)
- `resolvedAt` (timestamp nullable, auto-positionné au passage à `done`)

### boat_port_stays

- `id`, `boatId`
- `portName`
- `startedAt` (date), `endedAt` (date, nullable)
- `cost` (decimal 10,2, nullable)
- `notes` (nullable)

### boat_budget_entries

- `id`, `boatId`
- `amount` (decimal 10,2)
- `date` (date)
- `label`
- `category` : `maintenance | fuel | documents | port | equipment | other`
- `description` (nullable)

## Relations (résumé)

- `Organization 1..n User` via `users.organizationId`
- `Organization 1..n Boat` via `boats.organizationId`
- `Boat 1..n BoatEngine/BoatSail/BoatMaintenanceEvent/BoatMaintenanceTask`
- `Boat 0..1 BoatRig`
- `BoatMaintenanceEvent 1..n BoatMaintenancePart`
- `Boat 1..n BoatPortStay`
- `Boat 1..n BoatBudgetEntry`

## Seed (données démo)

Référence: `database/seeders/malo_seeder.ts` (données réelles de l'utilisateur admin, pas des données de démo génériques — voir `sandbox_seeder.ts` pour la démo "Marina Démo").

- crée (ou réutilise) un admin + organisation via `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- crée (ou réutilise) le boat `3D`
- crée un moteur, des voiles, un rig si absents

Référence: `database/seeders/billing_module_states_seeder.ts` (environnements `development`/`test`).

- crée une organisation par état de la matrice plan/abonnement/module de `/settings/billing` (Starter, Pro sans/avec abonnement, modules `subscription`/`granted`, add-on `extra_boats`, Enterprise avec/sans lignes `organization_modules`)
- crée de l’historique de maintenance
- crée des tasks “planned” pour les entrées ayant une `dueAt`
