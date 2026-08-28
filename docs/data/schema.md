# Données — schéma & relations

Source: `database/schema.ts` (généré automatiquement via migrations).

## Entités

### organizations

- `id`
- `name`, `slug`
- profil déclaré à l'inscription, nullables (#448) :
  - `type` (`rental` | `school` | `marina` | `private`)
  - `fleetSize` (`1-4` | `5-20` | `21-50` | `51+`)

### users

- `id`
- `email`
- `password` (non sérialisé)
- `fullName`
- `organizationId` (nullable)
- `lastLoginAt` (nullable)
- préférences d'interface, nullables — retombent sur le cookie puis sur un défaut :
  - `locale` (`en` | `fr`, #414)
  - `theme` (`system` | `light` | `dark`, #416)

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

### contact_messages

Messages du formulaire de contact public (`POST /contact`, #450). Table autonome : aucun lien vers `users`/`organizations`, l'expéditeur n'est pas authentifié.

- `id` (uuid)
- `subject` : `demo | pricing | migration | technical | partnership | other`
- `firstName`, `lastName`
- `email`
- `organization` (nullable)
- `fleetSize` (`1-4` | `5-20` | `20+`, nullable)
- `message` (text)
- `locale` (`fr` par défaut)
- `ipAddress` (nullable — renseigné pour tracer le throttle)
- `createdAt`
- index sur `email` et `created_at`

### ai_analyses

Résultats de génération de l'assistant IA : suggestions de flotte (dashboard), suggestions par bateau et diagnostic de panne moteur (#516). Une ligne par génération — l'UI n'affiche que la plus récente et l'historique sert d'archive.

- `id`
- `userId`, `organizationId` (nullable — l'org scope les lectures depuis #H-01)
- `boatId` (nullable — `null` pour une analyse de flotte)
- `boatEngineId` (nullable, FK `boat_engines` cascade — renseigné pour un `engine_diagnosis`, #516)
- `kind` : `fleet_analysis | boat_suggestions | engine_diagnosis`
- `locale` (`fr` par défaut, #460) — langue dans laquelle les suggestions ont été rédigées. Le texte étant produit librement par le modèle, il est intraduisible après coup : les lectures filtrent dessus pour ne jamais servir des suggestions françaises à une UI anglaise (et inversement)
- `responseText` (JSON sérialisé : `[{ "text": "…" }]` pour les suggestions ; objet `{ summary, recommendedSheet, causes[], nextStep }` pour un `engine_diagnosis`)
- `createdAt`
- index sur `(organization_id, kind)`, `(organization_id, kind, locale)` et `(boat_engine_id, kind, locale)`

### boat_engine_repair_cart_items

Liste de réparation du parcours « identification des pièces détachées » (#517) : les pièces repérées sur les vues éclatées s'accumulent par moteur, avec la référence relevée par l'utilisateur, puis s'exportent en CSV.

- `id`
- `boatEngineId` (FK `boat_engines` cascade)
- `partKey` (string 64) — clé stable d'une pièce du catalogue statique (`shared/constants/spare_parts/spare_parts_content.ts`, `<ensemble>.<slug>` ou `unreferenced.<slug>`), jamais renommée
- `quantity` (défaut 1 — un ré-ajout de la même pièce incrémente, plafond 99)
- `reference` (nullable — référence constructeur relevée sur la vue éclatée)
- `createdAt`, `updatedAt`
- unique `(boat_engine_id, part_key)`, index sur `boat_engine_id`

## Relations (résumé)

- `Organization 1..n User` via `users.organizationId`
- `Organization 1..n Boat` via `boats.organizationId`
- `Boat 1..n BoatEngine/BoatSail/BoatMaintenanceEvent/BoatMaintenanceTask`
- `BoatEngine 1..n BoatEngineRepairCartItem` via `boat_engine_repair_cart_items.boatEngineId` (#517)
- `Boat 0..1 BoatRig`
- `BoatMaintenanceEvent 1..n BoatMaintenancePart`
- `Boat 1..n BoatPortStay`
- `Boat 1..n BoatBudgetEntry`
- `User 1..n AiAnalysis` via `ai_analyses.userId` (`organizationId` scope les lectures, `boatId` distingue flotte et bateau)

## Seed (données démo)

Référence: `database/seeders/malo_seeder.ts` (données réelles de l'utilisateur admin, pas des données de démo génériques — voir `sandbox_seeder.ts` pour la démo "Marina Démo").

- crée (ou réutilise) un admin + organisation via `ADMIN_EMAIL`/`ADMIN_PASSWORD`, plan `pro`
- crée (ou réutilise) le boat `3D` — le seul de cette organisation
- crée un moteur, des voiles, un rig si absents
- crée (ou réutilise) le port `Querqueville` → mouillage `Corps-morts` → spot `B08`, et pose `boats.spotId` sur ce spot

Référence: `database/seeders/billing_module_states_seeder.ts` (environnements `development`/`test`).

- crée une organisation par état de la matrice plan/abonnement/module de `/settings/billing` (Starter, Pro sans/avec abonnement, modules `subscription`/`granted`, add-on `extra_boats`, Enterprise avec/sans lignes `organization_modules`)
- crée de l’historique de maintenance
- crée des tasks “planned” pour les entrées ayant une `dueAt`
