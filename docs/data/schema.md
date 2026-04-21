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

## Relations (résumé)

- `Organization 1..n User` via `users.organizationId`
- `Organization 1..n Boat` via `boats.organizationId`
- `Boat 1..n BoatEngine/BoatSail/BoatMaintenanceEvent/BoatMaintenanceTask`
- `Boat 0..1 BoatRig`
- `BoatMaintenanceEvent 1..n BoatMaintenancePart`

## Seed (données démo)

Référence: `database/seeders/demo_seeder.ts`.

- crée (ou réutilise) un admin + organisation via `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- crée (ou réutilise) le boat `Rhodes 21`
- crée un moteur, des voiles, un rig si absents
- crée de l’historique de maintenance
- crée des tasks “planned” pour les entrées ayant une `dueAt`

