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
- réglementaire: `flagCountry` (code ISO 3166-1 alpha-2, vocabulaire `COUNTRY_CODES`, nullable —
  cf. #580), `navigationCategory`, `hullIdentificationNumber`, `francisationNumber`, `maxPersons`
- armement: `armamentZone` (`basic | coastal | semi_offshore | offshore`, nullable — cf. #582)

`category` ne doit pas être confondue avec `navigationCategory` (catégorie CE A/B/C/D).

`armamentZone` non plus : `navigationCategory` est la **catégorie de conception CE** (ce que la
coque encaisse), `armamentZone` la **distance d'un abri** déclarée par l'utilisateur, seule
grandeur sur laquelle raisonne la Division 240. Un bateau de catégorie CE B peut naviguer en zone
`basic`, et inversement. Colonne nullable sans valeur par défaut : sans zone déclarée, aucun
contrôle de conformité n'est effectué (cf. `docs/domain/safety-compliance.md`).

`flagCountry` et `ports.country` partagent le même vocabulaire fermé (`shared/constants/countries.ts`).
La migration `1834000000000_normalize_country_codes` a normalisé l'existant en best-effort et
**conserve les valeurs non mappables** : la colonne peut donc encore porter du texte libre
historique, que l'affichage rend brut. Les largeurs de colonnes n'ont pas été rétrécies pour cette
raison.

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

### engine_brands

Référentiel global du catalogue moteur (#573), sans `organizationId` : alimenté par
`database/seeders/engine_catalog_seeder.ts`, jamais par les utilisateurs. Miroir de `boat_brands`.

- `id`
- `slug` (unique, **stable à vie** — jamais renommé)
- `name` (nom commercial officiel, casse comprise — jamais traduit), `country`
- `families` (`jsonb`) — un motoriste peut couvrir plusieurs familles (Volvo Penta : diesel et
  essence)
- `aliases` (`jsonb`) — orthographes et anciens noms (`volvo`, `VP`), base de
  `EngineCatalogService.resolveBrand()`
- `isActive`
- `plateLocationKey`, `plateExampleKey` (nullables) — clés i18n de l'aide « où trouver la plaque
  signalétique » (#575). Elles remplacent le tableau statique `ENGINE_PLATE_HINTS`, qui ne couvrait
  que trois marques ; une marque sans aide n'apparaît simplement pas dans la liste
- `referencePattern` (`jsonb`, nullable) — motif de décodage des références constructeur (#575) :
  `{ template, fallbackModelCode, modelCodePattern, explanationKey }`. Seule une marque qui en
  déclare un affiche la carte « décoder une référence » ; c'est la généralisation du cas Yamaha,
  qui était codé en dur dans `yamahaReferenceExample()`
- timestamps

### engine_models

- `id`, `engineBrandId` (FK `engine_brands`, `onDelete cascade`)
- `slug` (unique par marque, stable à vie), `name`
- `modelCode` — le code de la **plaque signalétique** (`D2-40`, `6E0`), jamais une reconstitution ;
  vide chez les hors-bord japonais, dont le préfixe ne se déduit pas du nom commercial
- `family` — un modèle appartient à **une seule** famille
- `powerHp`, `displacementCc`, `cylinders`, `strokeType`, `fuel` — servent au pré-remplissage non
  destructif du formulaire moteur, renseignés seulement quand la valeur est certaine
- `productionStartYear`, `productionEndYear` — les gammes discontinuées sont conservées
- `aliases` (`jsonb`)
- timestamps

### engine_part_references

Références constructeur rattachées à un couple (modèle du catalogue, pièce) — #575. Table globale,
alimentée par `engine_catalog_seeder` depuis `database/data/engine_catalog/part_references.ts`.

- `id`, `engineModelId` (FK `engine_models`, `onDelete cascade`)
- `partKey` (string 64) — même vocabulaire que le panier (`ALL_SPARE_PART_KEYS`)
- `reference` (string 64) — la référence constructeur
- `sourceLabel` (string 120, **NOT NULL**) — d'où vient la référence. Le `NOT NULL` est le cœur de
  l'issue : c'est la traduction en contrainte de schéma du critère d'acceptation de #517, « aucune
  référence n'est affichée sans indication de sa source ». Une référence sans source ne peut pas
  entrer en base, donc ne peut pas s'afficher
- `sourceUrl` (`text`, nullable) — lien vérifiable quand il existe
- `verifiedAt` (`date`, nullable) — dernière vérification ; vide = jamais revérifiée, et l'écran le
  dit explicitement au lieu de présenter l'entrée comme certaine
- `createdAt`, `updatedAt`
- unique `(engine_model_id, part_key)`, index sur `engine_model_id`

### equipment_brands

Référentiel global du catalogue d'équipements génériques (#577), sans `organizationId` : alimenté
par `database/seeders/equipment_catalog_seeder.ts`, jamais par les utilisateurs. Miroir de
`engine_brands`.

- `id`
- `slug` (unique, **stable à vie** — jamais renommé)
- `name` (nom commercial officiel, casse comprise — jamais traduit), `country`
- `categories` (`jsonb`) — une marque peut couvrir plusieurs catégories d'équipement (Lewmar :
  mouillage et accastillage, Quick : mouillage, électricité et plomberie). Le vocabulaire est celui
  de `boat_generic_equipment.category` (`GENERIC_EQUIPMENT_CATEGORIES`)
- `aliases` (`jsonb`) — orthographes et anciens noms (`waeco`, `autohelm`), base de
  `EquipmentCatalogService.resolveBrand()`
- `isActive`
- timestamps

### equipment_models

- `id`, `equipmentBrandId` (FK `equipment_brands`, `onDelete cascade`)
- `slug` (unique par marque, stable à vie), `name`
- `category` — un modèle appartient à **une seule** catégorie
- `productionStartYear`, `productionEndYear` — les gammes discontinuées sont conservées,
  renseignés seulement quand la date est certaine
- `aliases` (`jsonb`)
- timestamps

### sail_lofts

Référentiel global des voileries (#578), sans `organizationId` : alimenté par
`database/seeders/sail_loft_seeder.ts`, jamais par les utilisateurs. Miroir simplifié de
`equipment_brands` — **pas de table de modèles** : une voile est un produit sur mesure.

- `id`
- `slug` (unique, **stable à vie** — jamais renommé)
- `name` (nom commercial officiel, casse et accents compris — jamais traduit), `country`
- `aliases` (`jsonb`) — orthographes et anciens noms (`elvstrom`, `incidences`, `p&b`), base de
  `SailLoftService.resolveLoft()`
- `isActive`
- timestamps

### boat_generic_equipment

Équipements génériques d'un bateau (électronique, électricité, mouillage, pont, énergie, confort,
plomberie).

- `id`, `boatId` (FK `boats`, `onDelete cascade`)
- `category` — `GENERIC_EQUIPMENT_CATEGORIES` (#577 : `navigation`, `electrical`, `anchoring`,
  `deck`, `energy`, `comfort`, `plumbing`)
- `name`, `brand`, `model` (texte libre), `quantity`, `status` (`ok | to_check | to_replace`),
  `notes`
- `equipmentModelId` (FK `equipment_models`, **nullable**, `onDelete set null`) — rattachement au
  catalogue (#577). `brand` et `model` restent alimentés et font foi : c'est le repli texte libre,
  un équipement hors catalogue est parfaitement valide
- `purchasePrice`, `purchasedAt`
- timestamps

### boat_engines

- `id`, `boatId`
- `kind`, `status`
- `family` (string 40, **nullable**, indexée) — famille de motorisation (#574), moteur **et**
  transmission (`outboard_2t`, `inboard_diesel_saildrive`, `sterndrive`…). C'est elle qui décide de
  la nomenclature de pièces détachées ; un moteur sans famille retombe sur les ensembles génériques
- détails: `fuel`, `strokeType`, `brand`, `model`, `serialNumber`, `notes`
- `engineModelId` (FK `engine_models`, **nullable**, `onDelete set null`) — rattachement au
  catalogue (#573). `brand` et `model` restent alimentés et font foi : c'est le repli texte libre,
  un moteur hors catalogue est parfaitement valide
- puissance: `powerHp`, `powerKw`
- `hours` (total courant), `installHours` (référence figée à la création)
- `manufacturedAt`

### boat_sails

- `id`, `boatId`
- `sailType`
- `areaM2`, `reefPoints`
- `material` — enum `SAIL_MATERIALS` (#578) : les valeurs libres historiques ont été normalisées
  par migration best-effort, le résidu non mappable est passé en `other` avec la saisie d'origine
  recopiée dans `notes`
- `sailmaker` — voilerie en texte libre (#578), **source de vérité**, jamais contrainte par le
  référentiel
- `sailLoftId` (FK `sail_lofts`, nullable, `onDelete set null`) — rattachement facultatif au
  référentiel
- `status`, `notes`
- `purchasePrice`, `purchasedAt`
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
- `inspectionId` (FK `boat_inspections` nullable, SET NULL) — renseigné quand l'action a été levée depuis un état des lieux (#311) ; supprimer l'inspection ne détruit pas l'action
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

### ai_diagnosis_conversations

Conversations du chat IA public de diagnostic de panne (#602), le tunnel d'acquisition accessible sans compte. `userId`/`organizationId` nullables : une conversation anonyme n'a ni l'un ni l'autre (la propriété passe par la session) ; FK en `SET NULL` pour que les lignes survivent à la suppression du compte — elles portent le suivi des coûts. Le plafond « 2 conversations à vie » d'un plan `starter` est un simple `count(*)` sur `organization_id` : la ligne EST le compteur.

- `id`
- `token` (12 hex, unique — identifiant opaque exposé dans les routes, pattern `simulator_shares`)
- `userId` (nullable, FK `users` SET NULL)
- `organizationId` (nullable, FK `organizations` SET NULL, indexé)
- `locale`
- `status` : `active | completed` (une conversation `completed` est verrouillée)
- `context` (jsonb nullable — type moteur, marque, heures saisis librement au 1er message, aucune entité)
- `messages` (jsonb — fil `AiChatMessage[]` affiché tel quel)
- `result` (jsonb nullable — diagnostic final `{ summary, causes[], nextStep }`, rempli à la complétion)
- `tokensUsed` (cumul des tokens Mistral de la conversation, **y compris anonyme** — les plans avec IA émargent en plus à `ai_token_usages`)
- `createdAt`, `updatedAt`

### boat_engine_repair_cart_items

Liste de réparation du parcours « identification des pièces détachées » (#517) : les pièces repérées sur les vues éclatées s'accumulent par moteur, avec la référence relevée par l'utilisateur, puis s'exportent en CSV.

- `id`
- `boatEngineId` (FK `boat_engines` cascade)
- `partKey` (string 64) — clé stable d'une pièce du catalogue statique (`shared/constants/spare_parts/`, `<ensemble>.<slug>` ou `unreferenced.<slug>`), jamais renommée : #574 en a inséré 58 sans en renommer aucune
- `quantity` (défaut 1 — un ré-ajout de la même pièce incrémente, plafond 99)
- `reference` (nullable) — référence constructeur : **pré-remplie** depuis `engine_part_references`
  quand le couple (modèle, pièce) en a une (#575), sinon relevée par l'utilisateur sur la vue
  éclatée. Modifiable dans les deux cas — le catalogue assiste la saisie, il ne la contraint pas
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

### boat_inspections

États des lieux d'une réservation (check-out au départ, check-in au retour). Voir `docs/domain/inspections.md`.

- `id`, `reservationId` (FK `boat_reservations` cascade), `organizationId` (FK cascade)
- `kind` : `checkout | checkin` (contrainte CHECK) — unique `(reservation_id, kind)` : un seul état des lieux de chaque type par réservation
- `performedAt` (timestamp)
- `fuelLevel` (int 0–100, nullable), `engineHours` (decimal 6,2, nullable)
- `notes` (text nullable) — le constat hors-checklist
- `createdAt`, `updatedAt`

### boat_inspection_items

Constats structurés de la checklist d'état des lieux (#584). Le contenu des points de contrôle vit dans le corpus statique `shared/constants/inspections/inspection_checklist_content.ts` (clés stables jamais renommées, ciblage par catégorie de bateau #571) — la table ne persiste que les constats, sur le modèle de `boat_engine_diagnostic_checks`.

- `id`
- `boatInspectionId` (FK `boat_inspections` cascade)
- `itemKey` (string 64) — clé stable d'un point du corpus (`<section>.<slug>`), validée contre le corpus côté service
- `state` : `ok | remark | damage` (contrainte CHECK) — l'absence de ligne signifie « non contrôlé »
- `note` (text nullable) — obligatoire côté validation quand `state` vaut `remark` ou `damage`, effacée au retour à `ok`
- `createdAt`, `updatedAt`
- unique `(boat_inspection_id, item_key)`, index sur `boat_inspection_id`

### boat_fuel_logs

- `id`, `boatId`, `organizationId`, `boatEngineId` (nullable, SET NULL)
- `fueledAt` (indexé), `quantityLiters`, `pricePerLiter`, `totalCost`, `engineHoursAtFueling`
- `fuelType` (**nullable**, contrainte CHECK) — `diesel` | `essence` | `electric` | `other`, même vocabulaire que `boat_engines.fuel` (#585). Pré-rempli d'après le moteur choisi, modifiable — indispensable en bi-motorisation (in-bord diesel + hors-bord essence). Exporté en CSV (colonne `carburant`, vide pour l'historique)
- `supplier`, `notes`
- `createdAt`, `updatedAt`

### navigation_logs

Une ligne = une **sortie** (trip) du journal de bord — doc de domaine : `docs/domain/navigation-logs.md`.

- `id`, `boatId` (CASCADE), `organizationId` (CASCADE)
- `status` — `in_progress` | `completed` ; **index partiel `one_in_progress_per_boat`** (#182) : une seule sortie en cours par bateau, garanti côté base
- `departedAt` (indexé), `arrivedAt` (nullable)
- `departurePortId` / `arrivalPortId` (FK → ports, SET NULL) + `departurePortName` / `arrivalPortName` (nom libre)
- `distanceNm`, `engineHoursStart`, `engineHoursEnd`, `fuelConsumedLiters`
- `windForceBeaufort` (0–12), `seaState` (`calm`…`very_rough`), `crewCount`, `notes`
- `createdAt`, `updatedAt`

### navigation_log_crew

Pivot équipage d'une sortie (#101, IDOR scellé en #157).

- `navigationLogId` + `crewMemberId` (CASCADE), unicité du couple
- `role` — `skipper` | `crew` | `passenger`

### navigation_log_entries

Une ligne = un **point de log** consigné en cours de sortie (rafale GPS au tap → COG/SOG).

- `id`, `navigationLogId` (CASCADE), `organizationId` (CASCADE)
- `recordedAt` (index composite `(navigationLogId, recordedAt)`)
- `latitude` / `longitude` (nullables — point sans GPS possible, toujours fournis ensemble), `gpsAccuracyM`
- `cogDeg` (0–359, **null si vitesse quasi nulle** — mouillage), `sogKn`
- `sailConfig`, `note`
- `twdDeg`, `twaDeg`, `weatherSnapshot` (jsonb) — **réservés à l'itération météo GRIB**, jamais écrits aujourd'hui
- `createdAt`, `updatedAt`

## Relations (résumé)

- `Organization 1..n User` via `users.organizationId`
- `Organization 1..n Boat` via `boats.organizationId`
- `Boat 1..n BoatEngine/BoatSail/BoatMaintenanceEvent/BoatMaintenanceTask`
- `BoatEngine 1..n BoatEngineRepairCartItem` via `boat_engine_repair_cart_items.boatEngineId` (#517)
- `BoatBrand 1..n BoatModel` via `boat_models.boatBrandId` (#571) — référentiel global, non rattaché
  à une organisation ; `boats.manufacturer` / `boats.model` restent du **texte libre** et ne portent
  aucune clé étrangère vers ce catalogue, c'est ce qui garde une saisie hors catalogue possible
- `EngineModel 1..n EnginePartReference` via `engine_part_references.engineModelId` (#575, cascade) —
  une pièce sans référence connue n'a simplement pas de ligne, et l'écran retombe sur les liens
  revendeurs de #517
- `EngineBrand 1..n EngineModel` via `engine_models.engineBrandId` (#573) — même référentiel global ;
  `BoatEngine 0..1 EngineModel` via `boat_engines.engineModelId`, **nullable** et en `SET NULL` :
  `brand` / `model` restent le repli texte libre, retirer un modèle du corpus ne fait perdre aucune
  saisie
- `Boat 0..1 BoatRig`
- `BoatMaintenanceEvent 1..n BoatMaintenancePart`
- `Boat 1..n BoatPortStay`
- `Boat 1..n BoatBudgetEntry`
- `User 1..n AiAnalysis` via `ai_analyses.userId` (`organizationId` scope les lectures, `boatId` distingue flotte et bateau)
- `CrewMember 1..n CrewCertification` via `crew_certifications.crewMemberId`
- `Boat 1..n BoatReservation`, `Client 0..n BoatReservation` via `boat_reservations.clientId`
- `Boat 1..n BoatFuelLog`, `BoatEngine 0..n BoatFuelLog` via `boat_fuel_logs.boatEngineId`
- `Boat 1..n NavigationLog` ; `NavigationLog n..n CrewMember` via `navigation_log_crew` (rôle sur le pivot)
- `NavigationLog 1..n NavigationLogEntry` via `navigation_log_entries.navigationLogId`

## Catalogues bateaux et moteurs (référentiels, pas de la démo)

Références : `database/seeders/boat_catalog_seeder.ts` alimenté par `database/data/boat_catalog/`
(un fichier par catégorie) et `database/seeders/engine_catalog_seeder.ts` alimenté par
`database/data/engine_catalog/` (un fichier par famille de motorisation). Règles de saisie dans le
`README.md` de chaque dossier.

- **Pas de `static environment`** : contrairement aux seeders ci-dessous, ceux-ci alimentent des
  référentiels métier et tournent en production, enchaînés derrière le `migration:run --force` du
  service `migrator` de `docker-compose.prod.yml` (#542, #571, #573).
- **Idempotents** : `updateOrCreate` sur le slug (marques) puis sur `(<marque>Id, slug)` (modèles),
  **jamais de `delete`** — une ligne retirée des fichiers de données reste en base, elle peut être
  référencée. Les rejouer met les corpus à jour sans créer de doublon.

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
