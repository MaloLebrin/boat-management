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
- identité: `name`, `registrationNumber`, `category` (enum `BOAT_CATEGORIES`, nullable, indexée)
- identité historique: `type` — texte libre conservé pour les bateaux antérieurs à #571, plus
  alimenté par le formulaire ni affiché ; seul le backfill de la migration le relit
- propulsion/specs: `propulsionType`, `lengthM`, `beamM`, `draftM`, `mastHeightM`
- matériaux: `hullMaterial`
- construction: `yearBuilt`, `manufacturer`, `model`, `manufacturedAt`

`category` ne doit pas être confondue avec `navigationCategory` (catégorie CE A/B/C/D).

### boat_brands

Référentiel global du catalogue de bateaux (#571), sans `organizationId` : alimenté par
`database/seeders/boat_catalog_seeder.ts`, jamais par les utilisateurs.

- `id`
- `slug` (unique, **stable à vie** — jamais renommé)
- `name` (nom commercial officiel, accents compris — jamais traduit), `country`
- `categories` (`jsonb`) — une marque peut couvrir plusieurs catégories
- `aliases` (`jsonb`) — orthographes et anciens noms, base de `BoatCatalogService.resolveBrand()`
- `foundedYear`, `discontinuedYear`, `isActive`
- timestamps

### boat_models

- `id`, `boatBrandId` (FK `boat_brands`, `onDelete cascade`)
- `slug` (unique par marque, stable à vie), `name`
- `category` — un modèle appartient à **une seule** catégorie
- `lengthM`, `productionStartYear`, `productionEndYear` — renseignés seulement quand la valeur est
  certaine ; les gammes discontinuées sont conservées
- `aliases` (`jsonb`)
- timestamps

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

### crew_certifications

Titres de navigation d'un équipier (`crew_members`). Le vocabulaire de `type` est **partagé** avec les permis clients — source unique `shared/types/navigation_title.ts` (#585).

- `id`
- `crewMemberId` (FK `crew_members` cascade)
- `type` — `coastal_permit` | `offshore_permit` | `inland_permit` | `captain_200` | `vhf` | `crr` | `stcw_basic` | `stcw_proficiency` | `medical_certificate` | `first_aid` | `other` (contrainte CHECK)
- `referenceNumber` (nullable)
- `expiresAt` (nullable, indexé) — le formulaire propose une date d'après `shared/helpers/navigation_title.ts` (médical 2 ans, STCW 5 ans) sans jamais écraser une saisie
- `createdAt`, `updatedAt`

### clients

Fiches CRM (module `crm_invoicing`).

- `id`, `organizationId`
- identité : `firstName`, `lastName`, `email`, `phone`, `address`
- `navigationPermitNumber` (nullable)
- `navigationPermitType` (nullable, colonne texte libre validée côté VineJS) — mêmes valeurs que `crew_certifications.type`, plus `none` (#585). Les valeurs historiques `coastal`, `offshore`, `inland` restent acceptées et affichées, mais ne sont plus proposées à la saisie
- `status` (`active` | `inactive` | `blacklisted`)
- `notes`, `gdprConsentAt`, `anonymizedAt` (#276)
- `createdAt`, `updatedAt`

### boat_reservations

- `id`, `boatId`, `organizationId`, `clientId` (nullable, SET NULL)
- `status` (`option` | `confirmed` | `cancelled`)
- `type` (**nullable**, contrainte CHECK) — `bareboat` | `skippered` | `day_charter` | `cabin` | `other` (#585). Les réservations antérieures restent sans type et s'affichent sans badge
- période : `startsAt`, `endsAt`
- instantané client : `clientName`, `clientEmail`, `clientPhone`
- `notes`, `totalPrice`
- `createdAt`, `updatedAt`

### boat_fuel_logs

- `id`, `boatId`, `organizationId`, `boatEngineId` (nullable, SET NULL)
- `fueledAt` (indexé), `quantityLiters`, `pricePerLiter`, `totalCost`, `engineHoursAtFueling`
- `fuelType` (**nullable**, contrainte CHECK) — `diesel` | `essence` | `electric` | `other`, même vocabulaire que `boat_engines.fuel` (#585). Pré-rempli d'après le moteur choisi, modifiable — indispensable en bi-motorisation (in-bord diesel + hors-bord essence). Exporté en CSV (colonne `carburant`, vide pour l'historique)
- `supplier`, `notes`
- `createdAt`, `updatedAt`

## Relations (résumé)

- `Organization 1..n User` via `users.organizationId`
- `Organization 1..n Boat` via `boats.organizationId`
- `Boat 1..n BoatEngine/BoatSail/BoatMaintenanceEvent/BoatMaintenanceTask`
- `BoatEngine 1..n BoatEngineRepairCartItem` via `boat_engine_repair_cart_items.boatEngineId` (#517)
- `BoatBrand 1..n BoatModel` via `boat_models.boatBrandId` (#571) — référentiel global, non rattaché
  à une organisation ; `boats.manufacturer` / `boats.model` restent du **texte libre** et ne portent
  aucune clé étrangère vers ce catalogue, c'est ce qui garde une saisie hors catalogue possible
- `Boat 0..1 BoatRig`
- `BoatMaintenanceEvent 1..n BoatMaintenancePart`
- `Boat 1..n BoatPortStay`
- `Boat 1..n BoatBudgetEntry`
- `User 1..n AiAnalysis` via `ai_analyses.userId` (`organizationId` scope les lectures, `boatId` distingue flotte et bateau)
- `CrewMember 1..n CrewCertification` via `crew_certifications.crewMemberId`
- `Boat 1..n BoatReservation`, `Client 0..n BoatReservation` via `boat_reservations.clientId`
- `Boat 1..n BoatFuelLog`, `BoatEngine 0..n BoatFuelLog` via `boat_fuel_logs.boatEngineId`

## Catalogue de bateaux (référentiel, pas de la démo)

Référence : `database/seeders/boat_catalog_seeder.ts`, alimenté par `database/data/boat_catalog/`
(un fichier par catégorie, règles de saisie dans le `README.md` du dossier).

- **Pas de `static environment`** : contrairement aux seeders ci-dessous, celui-ci alimente un
  référentiel métier et tourne en production, enchaîné derrière le `migration:run --force` du
  service `migrator` de `docker-compose.prod.yml` (#542, #571).
- **Idempotent** : `updateOrCreate` sur le slug (marques) puis sur `(boatBrandId, slug)` (modèles),
  **jamais de `delete`** — une ligne retirée des fichiers de données reste en base, elle peut être
  référencée. Le rejouer met le corpus à jour sans créer de doublon.

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
