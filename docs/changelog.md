# Changelog

Toutes les nouvelles fonctionnalités, améliorations et correctifs notables.  
Format : `[date] — Description`. Les entrées les plus récentes sont en haut.

## 2026-06-24 — Tableau de bord budget (dépenses annuelles par poste)

Nouvelle page **Budget** accessible depuis la fiche de chaque bateau (bouton « Budget »).

**Fonctionnalités :**

- Vue agrégée des dépenses par poste : maintenance, carburant, documents/assurance, port (à venir)
- Sélecteur d'année avec comparaison N-1 (delta %)
- Graphique barres empilées mensuel (chart.js + vue-chartjs)
- Export CSV du budget annuel : `GET /boats/:id/export/budget.csv?year=YYYY`
- Champ `cost` ajouté à `boat_documents` (migration + validator + service)

**Routes :**

- `GET /boats/:id/budget` — page budget (paramètre `?year=YYYY` optionnel, défaut = année courante)
- `GET /boats/:id/export/budget.csv` — export CSV du budget annuel

**Sources de données :**

- Maintenance : `SUM(boat_maintenance_parts.unit_price × quantity)` groupé par mois
- Carburant : `SUM(boat_fuel_logs.total_cost)` groupé par mois
- Documents : `SUM(boat_documents.cost)` groupé par mois (date de `issued_at`)
- Port : non disponible en V1, affiché comme « à venir »

## 2026-06-23 — Import / Export CSV (maintenance, avitaillements, journal de bord)

Nouvelle section **Import / Export CSV** accessible dans Paramètres → Import CSV (plans Pro et Enterprise uniquement).

**Export CSV** : téléchargement direct depuis la page de chaque bateau ou depuis la page d'import, format UTF-8 BOM + séparateur `;` (compatibilité Excel FR).

- `GET /boats/:id/export/maintenance.csv` — événements de maintenance avec coût total
- `GET /boats/:id/export/fuel-logs.csv` — avitaillements (quantité, prix, heures moteur…)
- `GET /boats/:id/export/navigation-logs.csv` — journal de bord (départ/arrivée, distance, météo…)

**Import CSV** : upload d'un fichier, dry-run avec aperçu ligne par ligne et rapport d'erreurs, puis confirmation pour créer les enregistrements en base.

- `GET /settings/import` — page d'import/export
- `POST /settings/import/preview` — dry-run, aperçu (50 premières lignes, erreurs colonne par colonne)
- `POST /settings/import/confirm` — import effectif des lignes valides
- `POST /settings/import/cancel` — annulation

**Format attendu (maintenance)** : `date;title;subject;notes;engine_caption;sail_caption;cost`

- `subject` : `boat | hull | engine | sail | rig | electrical | plumbing | safety | deck | other`
- `engine_caption` requis si `subject=engine` ; `sail_caption` requis si `subject=sail`

**Backend**

- `shared/types/csv.ts` — types `CsvImportType`, `CsvPreviewRow`, `CsvImportPreviewData`, `MaintenanceImportRow`, `MAINTENANCE_CSV_HEADERS`
- `app/exceptions/csv_errors.ts` — `CsvImportValidationError`
- `app/validators/csv_import.ts` — `csvPreviewValidator`, `csvConfirmValidator`
- `app/services/csv_import_service.ts` — parsing CSV (BOM, guillemets, semicolons), validation par colonne, `importMaintenanceRows()`
- `app/services/csv_export_service.ts` — `buildCsv()` (BOM + `;`), `csvFilename()`
- `app/controllers/csv_import_controller.ts` — `show`, `preview`, `confirm`, `cancel`
- `app/controllers/csv_export_controller.ts` — `maintenance`, `fuelLogs`, `navigationLogs`
- `start/routes/settings.ts` — routes import
- `start/routes/boats.ts` — routes export
- `resources/lang/{fr,en}/settings.json` — clés `settings.import.*`
- `resources/lang/{fr,en}/flash.json` — clés `flash.csv.*`

**Frontend**

- `inertia/pages/settings/import.vue` — page shell
- `inertia/components/settings/tabs/SettingsImportTab.vue` — formulaire upload + tableau aperçu + section export
- `inertia/components/settings/SettingsShell.vue` — lien "Import CSV" visible sur plans Pro/Enterprise
- `inertia/utils/routes.ts` — helpers `routes.csv.*`
- `.adonisjs/server/pages.d.ts` — enregistrement `settings/import`

## 2026-06-23 — Nouvelles catégories d'équipement (sécurité, navigation, électricité, mouillage, pont)

Extension du modal d'ajout d'équipement (`BoatEquipmentAddModal`) avec 5 nouvelles catégories. La catégorie **Sécurité** était déjà implémentée côté backend ; les 4 autres (`navigation`, `electrical`, `anchoring`, `deck`) utilisent un nouveau modèle générique `boat_generic_equipment`.

**Backend**

- `database/migrations/1800000002000_create_boat_generic_equipment_table.ts` — table `boat_generic_equipment` : `boat_id`, `category`, `name`, `brand`, `model`, `quantity`, `status`, `notes`
- `app/models/boat_generic_equipment.ts` — modèle Lucid étendant `BoatGenericEquipmentSchema`
- `shared/types/boat.ts` — constante `GENERIC_EQUIPMENT_CATEGORIES`, types `GenericEquipmentCategory` et `BoatGenericEquipmentPayload`
- `shared/constants/boats/boat_form_options.ts` — constante `GENERIC_EQUIPMENT_STATUS_OPTIONS` (ok / to_check / to_replace)
- `app/validators/boat_generic_equipment.ts` — validators `createGenericEquipmentValidator` et `updateGenericEquipmentValidator`
- `app/services/boat_generic_equipment_service.ts` — service avec `create`, `update`, `delete`
- `app/controllers/boat_generic_equipment_controller.ts` — contrôleur `store` / `update` / `destroy` ; redirige vers `?tab=equipment`
- `app/models/boat.ts` — relation `hasMany(() => BoatGenericEquipment)`
- `app/services/boat_hull_service.ts` — preload `genericEquipment` dans `getFullDetailForUser`
- `app/transformers/boat_transformer.ts` — `toGenericEquipmentItem`, ajouté dans `toBoatDetail`
- `start/routes/boats.ts` — `POST/PUT/DELETE /boats/:boatId/generic-equipment[/:itemId]`

**Frontend**

- `inertia/types/boat_show.ts` — type `BoatShowGenericEquipment`, champ `genericEquipment[]` dans `BoatShowDetail`
- `inertia/composables/use_boat_options.ts` — `genericEquipmentStatusOptions`
- `inertia/components/boats/equipment/BoatGenericEquipmentFields.vue` — formulaire générique (nom, marque, modèle, quantité, état, notes)
- `inertia/components/boats/equipment/BoatGenericEquipmentCard.vue` — card avec items groupés par catégorie + modaux create/edit/delete
- `inertia/components/boats/show/modals/BoatEquipmentAddModal.vue` — 5 nouvelles catégories ; catégorie transmise via `<input type="hidden" name="category">`
- `inertia/components/boats/show/tabs/BoatShowTabEquipment.vue` — filtre pill "Équipements" + `<BoatGenericEquipmentCard>`

**i18n**

- `resources/lang/fr/boats.json` — clés `equipmentAddModal.categories.*` (safety, navigation, electrical, anchoring, deck), section `genericEquipment`, `options.genericEquipmentStatus`
- `resources/lang/en/boats.json` — idem + ajout de la section `equipmentAddModal` manquante
- `resources/lang/{fr,en}/flash.json` — clés `genericEquipment.{created,updated,deleted,notFound}`

---

## 2026-06-23 — Section Navigation globale dans la sidebar

Restructuration de l'architecture de navigation de l'app pour refléter sa double identité : gestion de flotte + navigation opérationnelle.

**Backend**

- `start/routes/navigation.ts` — 3 nouvelles routes GET protégées par `middleware.auth()` : `/navigation/logbook`, `/navigation/fuel`, `/navigation/incidents`
- `start/routes.ts` — import du nouveau fichier de routes navigation
- `app/controllers/navigation_controller.ts` — contrôleur mince (`@inject()`) avec 3 méthodes : `logbook()`, `fuel()`, `incidents()`. Filtre optionnel `?boatId=` via query string
- `app/services/navigation_service.ts` — service avec 4 méthodes : `getFleetBoats()`, `getFleetLogbook()`, `getFleetFuelLogs()`, `getFleetIncidents()`. Requêtes sur `NavigationLog`, `BoatFuelLog`, `BoatIncident` filtrées par `organizationId`. Preload `boat` (id + name uniquement)
- `shared/types/navigation.ts` — nouveaux types : `FleetLogbookRow`, `FleetFuelLogRow`, `FleetIncidentRow`, `FleetBoatOption`

**Frontend**

- `inertia/composables/use_nav_sections.ts` — ajout section "NAVIGATION" entre Maintenance et Préférences avec 3 items : Journal de bord (`/navigation/logbook`), Carburant (`/navigation/fuel`), Incidents (`/navigation/incidents`)
- `inertia/components/layout/NavIcon.vue` — 3 nouveaux icônes SVG : `compass`, `fuel`, `alert-triangle`
- `inertia/components/navigation/NavigationBoatFilter.vue` — composant select partagé pour filtrer par bateau (utilise `router.get` avec `replace: true`)
- `inertia/components/navigation/LogbookRow.vue`, `FuelLogRow.vue`, `IncidentRow.vue` — lignes de tableau avec lien vers `/boats/:id/navigation`
- `inertia/pages/navigation/logbook.vue` — vue globale du journal de bord (statut, bateau, ports départ/arrivée, distance, date)
- `inertia/pages/navigation/fuel.vue` — vue globale des avitaillements (bateau, date, quantité, coût, fournisseur)
- `inertia/pages/navigation/incidents.vue` — vue globale des incidents (statut, bateau, type, date, lieu)

**i18n**

- `resources/lang/fr/nav.json` + `en/nav.json` — clés `logbook`, `fuel`, `incidents`, `sections.navigation`
- `resources/lang/fr/navigation.json` + `en/navigation.json` — fichiers complets pour les 3 pages globales (titres, colonnes, stats, états vides, filtre)

---

## 2026-06-23 — Tracking GPS / AIS — position temps réel des bateaux (V1) #112

**Backend**

- `database/migrations/1800000000000_alter_boats_add_mmsi_imo.ts` — ajout `mmsi` (varchar 9, nullable) et `imo_number` (varchar 20, nullable) sur la table `boats`
- `database/migrations/1800000001000_alter_boat_position_history_add_gps.ts` — enrichissement `boat_position_history` : `latitude` (decimal 10,7), `longitude` (decimal 10,7), `speed_knots` (decimal 5,2), `heading_degrees` (int), `source` (string : `manual | ais | gps`, défaut `manual`)
- `app/models/boat.ts` — colonnes `mmsi` et `imoNumber`
- `app/models/boat_position_history.ts` — colonnes `latitude`, `longitude`, `speedKnots`, `headingDegrees`, `source`
- `shared/types/boat.ts` — `BoatPositionSource`, `BoatPositionPayload`, champs `mmsi` et `imoNumber` dans `BoatHullPayload`
- `app/validators/boat.ts` — règles MMSI (regex `/^\d{9}$/`) et `imoNumber` dans create/update ; nouveau `updateBoatPositionValidator` (lat/lng avec range)
- `app/services/boat_position_service.ts` — `storeManualPosition()` : crée une entrée `boat_position_history` avec `source='manual'`, clôture l'entrée GPS ouverte précédente
- `app/services/boat_hull_service.ts` — persistance `mmsi` et `imoNumber` dans `createForUser()` et `updateForUser()`
- `app/controllers/boat_position_controller.ts` — `POST /boats/:boatId/position` → valide lat/lng, délègue au service
- `app/controllers/boats_controller.ts` — correction des bugs pré-existants : injection `NavigationLogService`, résolution `navigationLogs`, `portOptions`, `canCreateNavigationLogs`, `canUpdateNavigationLogs`, `canDeleteNavigationLogs` dans `show()`
- `app/transformers/boat_transformer.ts` — `toEditForm` et `toBoatDetail` exposent `mmsi` et `imoNumber` ; `toPositionHistoryEntry` expose `latitude`, `longitude`, `source`
- `start/routes/boats.ts` — route `POST /boats/:boatId/position` → `boats.position.store`

**Frontend**

- `inertia/types/boat_show.ts` — `BoatPositionHistoryRow` : ajout `latitude`, `longitude`, `source` ; `BoatShowDetail` : ajout `mmsi`, `imoNumber`
- `inertia/types/boat_form.ts` — `BoatEditPayload` : ajout `mmsi`, `imoNumber`
- `inertia/components/boats/hull/BoatFormHullFields.vue` — section « Identification AIS » avec champs MMSI et N° IMO
- `inertia/components/boats/show/tabs/overview/BoatOverviewPositionCard.vue` — carte Leaflet (OpenStreetMap) si lat/lng disponible ; formulaire de saisie manuelle lat/lng (Inertia `router.post`)
- `inertia/components/boats/show/tabs/BoatShowTabOverview.vue` — calcul `latestGpsPosition` (dernier historique avec lat/lng non clôturé), passage en props à `BoatOverviewPositionCard`
- `package.json` — dépendances `leaflet` 1.9.4 et `@types/leaflet` 1.9.21
- i18n (fr + en) — clés `hullFields.aisSection`, `mmsi`, `imoNumber`, `show.position.setGps`, `gpsCoords`, `manualTitle`, `latitude`, `longitude`, `saveGps`

**Notes V1** : affichage position manuelle sur carte uniquement (sans AIS). L'intégration API AIS (MarineTraffic / AISHub) et le geofencing sont prévus pour V2 (plan Enterprise).

---

## 2026-06-23 — Gestion des équipiers #110

**Backend**

- `database/migrations/1799000000000_create_crew_members_table.ts` — table `crew_members` : `organization_id` (FK CASCADE), `first_name`, `last_name`, `email` (nullable), `phone` (nullable), `notes` (text nullable)
- `database/migrations/1799000001000_create_crew_certifications_table.ts` — table `crew_certifications` : `crew_member_id` (FK CASCADE), `type` (enum : `coastal_permit | offshore_permit | vhf | stcw_basic | stcw_proficiency | other`), `reference_number` (nullable), `expires_at` (date nullable, indexé)
- `database/migrations/1799000002000_create_navigation_log_crew_table.ts` — table pivot `navigation_log_crew` : `navigation_log_id` (FK CASCADE), `crew_member_id` (FK CASCADE), `role` (enum : `skipper | crew | passenger`, défaut `crew`), contrainte unique `(navigation_log_id, crew_member_id)`
- `app/models/crew_member.ts` — modèle Lucid avec `hasMany(() => CrewCertification)` et `manyToMany(() => NavigationLog)`
- `app/models/crew_certification.ts` — modèle Lucid avec getters calculés `isExpired` et `expiresInDays`
- `app/models/navigation_log.ts` — ajout relation `manyToMany(() => CrewMember, { pivotTable: 'navigation_log_crew', pivotColumns: ['role'] })`
- `shared/types/crew.ts` — types `CrewMemberRow`, `CrewCertificationRow`, `NavigationLogCrewRow`, `CrewMemberOption`, payloads CRUD, enums `CrewCertificationType`, `NavigationLogCrewRole`
- `shared/types/navigation_log.ts` — ajout du champ `crew: NavigationLogCrewRow[]` dans `NavigationLogRow`
- `app/exceptions/crew_errors.ts` — `CrewMemberNotFoundError`, `CrewCertificationNotFoundError`
- `app/validators/crew.ts` — `createCrewMemberValidator`, `updateCrewMemberValidator`, `createCrewCertificationValidator`, `syncNavigationLogCrewValidator`
- `app/policies/crew_member_policy.ts` — `create`/`update` (membres de l'orga), `delete` (admin uniquement)
- `app/services/crew_service.ts` — CRUD équipiers, gestion certifications, `syncCrewForNavigationLog()`, `listOptionsForOrganization()`
- `app/services/crew_role_pdf_service.ts` — génération PDF rôle d'équipage (PDFKit), format tableau avec nom/rôle/email, en-tête de sortie
- `app/services/navigation_log_service.ts` — ajout `getForBoat()`, preload `crew` dans `listForBoat()`
- `app/controllers/crew_members_controller.ts` — `index`, `store`, `update`, `destroy`
- `app/controllers/crew_certifications_controller.ts` — `store`, `destroy`
- `app/controllers/navigation_log_crew_controller.ts` — `sync` (PATCH, remplace tout l'équipage de la sortie)
- `app/controllers/crew_role_pdf_controller.ts` — `download` (GET, retourne PDF)
- `app/transformers/boat_transformer.ts` — ajout `crewMemberOptions` dans `BoatShowContext`, crew dans `toNavigationLog()`
- `app/controllers/boats_controller.ts` — injection `CrewService`, chargement `crewMemberOptions` dans `show()`
- `start/routes/crew.ts` — routes `/crew` CRUD + certifications
- `start/routes/boats.ts` — ajout `PATCH /boats/:boatId/navigation-logs/:logId/crew`, `GET /boats/:boatId/navigation-logs/:logId/crew-role.pdf`
- `start/routes.ts` — import `./routes/crew.js`

**Frontend**

- `inertia/pages/organization/crew.vue` — page liste équipiers avec CRUD inline et gestion des certifications par membre
- `inertia/components/crew/CrewMemberForm.vue` — formulaire création/édition équipier
- `inertia/components/crew/CrewCertificationForm.vue` — formulaire ajout de certification (type, référence, expiration)
- `inertia/components/crew/CrewCertificationBadge.vue` — badge statut certification (valide / expire bientôt / expirée)
- `inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue` — panel gestion équipage d'une sortie (ajout/suppression membres avec rôle, lien PDF)
- `inertia/components/boats/show/tabs/BoatShowTabNavigationLogs.vue` — ajout `crewMemberOptions` prop + intégration `NavigationLogCrewPanel`
- `inertia/components/boats/show/BoatShowTabContent.vue` — prop `crewMemberOptions` transmise
- `inertia/pages/boats/show.vue` — prop `crewMemberOptions` déclarée
- `inertia/composables/use_nav_sections.ts` — ajout entrée "Équipiers" `/crew` dans section FLOTTE
- `inertia/components/layout/NavIcon.vue` — ajout icône `people`

**i18n**

- `resources/lang/fr/crew.json`, `resources/lang/en/crew.json` — toutes les clés équipiers/certifications/PDF
- `resources/lang/fr/nav.json`, `resources/lang/en/nav.json` — clé `crew`
- `resources/lang/fr/flash.json`, `resources/lang/en/flash.json` — namespace `crew`

---

## 2026-06-22 — Journal de bord — saisie des sorties #101

**Backend**

- `database/migrations/1798000000000_create_navigation_logs_table.ts` — table `navigation_logs` : `boat_id` (FK CASCADE), `organization_id` (FK CASCADE), `status` (enum : `in_progress | completed`, défaut `in_progress`), `departed_at` (datetime, indexé), `arrived_at` (nullable), `departure_port_id` / `arrival_port_id` (FK nullable → ports, `SET NULL`), `departure_port_name` / `arrival_port_name` (texte libre fallback), `distance_nm` (decimal), `engine_hours_start` / `engine_hours_end` (decimal), `fuel_consumed_liters` (decimal), `wind_force_beaufort` (int 0–12), `sea_state` (enum : `calm | slight | moderate | rough | very_rough`), `crew_count` (int), `notes` (text)
- `app/models/navigation_log.ts` — modèle Lucid avec relations `@belongsTo` vers `Boat`, `Port` (départ et arrivée)
- `app/exceptions/navigation_log_errors.ts` — `NavigationLogNotFoundError`, `NavigationLogValidationError`
- `shared/types/navigation_log.ts` — types `NavigationLogRow`, `CreateNavigationLogPayload`, `CloseNavigationLogPayload`, `NavigationLogPortOption`, enums `NavigationLogStatus`, `SeaState`
- `app/services/navigation_log_service.ts` — `listForBoat()`, `createForBoat()`, `closeTrip()` (atomique via transaction DB, met à jour `boat_engines.hours` si `engineHoursEnd` fourni), `deleteForBoat()`
- `app/validators/navigation_log.ts` — `createNavigationLogValidator`, `closeNavigationLogValidator` (VineJS)
- `app/policies/navigation_log_policy.ts` — `create` (même org), `delete` (admin uniquement via `before()`)
- `app/controllers/navigation_logs_controller.ts` — routes `store`, `close` (PATCH), `destroy`
- `app/transformers/boat_transformer.ts` — ajout `toNavigationLog()`, mise à jour `BoatShowContext` et `toShowProps`
- `app/models/boat.ts` — ajout relation `hasMany(() => NavigationLog)`
- `app/controllers/boats_controller.ts` — chargement des `navigationLogs` et `portOptions` dans `show()`, vérification bouncer `NavigationLogPolicy`
- `app/services/port_service.ts` — ajout méthode `listNamesForOrg()` (requête légère `id + name`)
- `start/routes/boats.ts` — routes `POST /boats/:boatId/navigation-logs`, `PATCH /boats/:boatId/navigation-logs/:logId/close`, `DELETE /boats/:boatId/navigation-logs/:logId`

**Frontend**

- `inertia/types/boat_show.ts` — export des types `NavigationLogRow`, `NavigationLogStatus`, `SeaState`, `NavigationLogPortOption`
- `inertia/components/boats/show/tabs/NavigationLogForm.vue` — formulaire de création de sortie (départ, port, heures moteur, météo, équipiers, notes)
- `inertia/components/boats/show/tabs/NavigationLogCloseForm.vue` — formulaire de clôture (arrivée, port, distance, heures moteur, carburant, météo)
- `inertia/components/boats/show/tabs/BoatShowTabNavigationLogs.vue` — onglet liste des sorties avec création inline et clôture inline
- `inertia/pages/boats/show.vue` — ajout de l'onglet `navigation-logs`, nouvelles props `navigationLogs`, `portOptions`, `canCreateNavigationLogs`, `canDeleteNavigationLogs`

**i18n**

- `resources/lang/fr/navigation_logs.json` + `resources/lang/en/navigation_logs.json` — nouveau namespace
- `resources/lang/fr/flash.json` + `resources/lang/en/flash.json` — clés `flash.navigationLog.*`

**Comportement notable**

- La clôture d'une sortie est atomique : mise à jour du log + mise à jour des heures moteur du premier moteur actif du bateau dans une seule transaction
- Validation : `arrivedAt > departedAt` côté service (erreur flash `arrivedAtBeforeDeparture`)
- Les ports existants de l'organisation sont proposés en dropdown (optionnel), avec fallback texte libre
- Seuls les admins peuvent supprimer des sorties (policy `delete` toujours `false` sauf via `before()`)

## 2026-06-21 — Notifications temps réel via Transmit

**Backend**

- `config/transmit.ts` — configuration de `@adonisjs/transmit` (transport in-process, no ping)
- `start/transmit.ts` — preload : enregistrement des routes SSE (`/__transmit/events`, `/__transmit/subscribe`, `/__transmit/unsubscribe`) + autorisation de canal `notifications/:userId` (seul le propriétaire peut s'abonner)
- `adonisrc.ts` — ajout du provider `@adonisjs/transmit/transmit_provider` et du preload `start/transmit`
- `app/services/notification_service.ts` — après `Notification.create()`, diffusion SSE sur le canal `notifications/:userId` avec le payload `{ notification: NotificationForFront }`

**Frontend**

- `inertia/composables/use_notifications.ts` — état réactif au niveau module (singleton) + abonnement Transmit dans `onMounted` (connexion unique par session, guard par `subscribedUserId`) ; synchronisation avec les shared props Inertia à chaque navigation ; CSRF géré via `beforeSubscribe`/`beforeUnsubscribe` (ajout du header `X-XSRF-TOKEN` lu depuis le cookie `XSRF-TOKEN`) ; reset automatique de la souscription en cas de changement d'utilisateur (logout/login sans rechargement de page)

**Comportement**

- Connexion SSE établie automatiquement après le premier montage d'un composant authentifié utilisant `useNotifications()`
- Le badge de la cloche se met à jour en temps réel sans rechargement de page
- Le panneau de notifications ajoute la nouvelle notification en tête de liste (max 5 récentes)
- Fallback gracieux : si la connexion Transmit échoue, les données restent synchronisées via les shared props Inertia à chaque navigation

## 2026-06-21 — Notifications in-app #104

**Backend**

- `database/migrations/1798000000000_create_notifications_table.ts` — table `notifications` : `user_id` (FK CASCADE), `organization_id` (FK CASCADE), `type` (string 100), `severity` (string 20, default 'info'), `title` (string 500), `body` (text nullable), `action_url` (string 1000 nullable), `metadata` (json nullable), `read_at` (timestamp nullable), `created_at` (timestamp). Index sur `(user_id, read_at)` et `(organization_id, created_at)`
- `app/models/notification.ts` — modèle Lucid avec relations `belongsTo(User)` et `belongsTo(Organization)`, getter `isRead`
- `shared/types/notification.ts` — types `NotificationType` (extensible), `NotificationSeverity`, `NotificationForFront`, `NotificationsSharedProps`, `NotificationsPage`, `CreateNotificationParams`
- `app/transformers/notification_transformer.ts` — fonction `toRow()` pour le frontend
- `app/services/notification_service.ts` — `create`, `getUnreadCount`, `getRecentUnread`, `sharedProps`, `listForUser`, `markRead`, `markAllRead`, `destroy`
- `app/controllers/notifications_controller.ts` — `index` (page paginée), `markAsRead`, `markAllAsRead`, `destroy` ; réponses par redirection
- `start/routes/notifications.ts` — routes `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`
- `app/middleware/inertia_middleware.ts` — injection de `NotificationService`, prop partagée `notifications` (unreadCount + recent) pour les utilisateurs authentifiés
- `app/listeners/send_ai_token_quota_notification.ts` — création d'une notification in-app en plus de l'email
- `app/listeners/send_storage_quota_notification.ts` — création d'une notification in-app en plus de l'email
- `app/listeners/on_organization_member_joined.ts` — notification aux admins quand un membre rejoint l'organisation
- `app/listeners/on_organization_plan_downgraded.ts` — notification aux admins en plus de l'email
- `resources/lang/fr/notifications.json` et `resources/lang/en/notifications.json` — toutes les clés UI du module

**Frontend**

- `inertia/pages/notifications/index.vue` — page de liste des notifications avec pagination, actions mark as read / delete

## 2026-06-19 — Suivi carburant / avitaillement #102

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

## 2026-06-19 — Rapport d'incident / avarie #106

**Backend**

- `database/migrations/1796000000000_create_boat_incidents_table.ts` — table `boat_incidents` : `boat_id`, `organization_id`, `occurred_at`, `type` (enum : grounding, flooding, rigging_failure, engine_failure, collision, fire, theft_vandalism, other), `location`, `description`, `insurance_claimed`, `insurance_claim_ref`, `status` (enum : open, in_progress, closed), `closed_at`
- `app/models/boat_incident.ts` — modèle Lucid avec relation `belongsTo(Boat)`
- `app/exceptions/incident_errors.ts` — `BoatIncidentNotFoundError`, `BoatIncidentValidationError`
- `shared/types/incident.ts` — types `IncidentType`, `IncidentStatus`, `CreateIncidentPayload`, `UpdateIncidentPayload`, `BoatIncidentRow`
- `app/validators/boat_incident.ts` — `createBoatIncidentValidator`, `updateBoatIncidentValidator`
- `app/policies/incident_policy.ts` — policy Bouncer (view, create, edit, delete)
- `app/services/boat_incident_service.ts` — `listForBoat`, `createForBoat`, `updateForBoat`, `deleteForBoat` ; clôture automatique de `closed_at` au passage en statut `closed`
- `app/controllers/boat_incidents_controller.ts` — `store`, `update`, `destroy`
- `start/routes/boats.ts` — routes `POST /boats/:boatId/incidents`, `PUT /boats/:boatId/incidents/:incidentId`, `DELETE /boats/:boatId/incidents/:incidentId`
- `app/controllers/boats_controller.ts` — injection de `BoatIncidentService`, chargement des incidents dans le `show`
- `app/transformers/boat_transformer.ts` — `toIncident()` + inclusion dans `toShowProps()`
- `resources/lang/fr/flash.json` et `resources/lang/en/flash.json` — clés `incidents.*`

**Frontend**

- `resources/lang/fr/incidents.json` et `resources/lang/en/incidents.json` — toutes les clés UI du module
- `inertia/types/boat_show.ts` — types `IncidentType`, `IncidentStatus`, `BoatIncidentRow`
- `inertia/components/boats/show/tabs/BoatShowTabIncidents.vue` — onglet incidents : liste avec code couleur par statut (open=coral, in_progress=amber, closed=gris), formulaire création/édition inline, suppression avec confirmation
- `inertia/pages/boats/show.vue` — ajout de l'onglet "Incidents" avec badge comptant les incidents ouverts/en cours

## 2026-06-19 — Correctifs documents administratifs bateau (#103 suite)

**Correctifs bloquants**

- `app/jobs/send_reminder_emails.ts` — fenêtres d'envoi exclusives : `(8, 30)` + `(0, 7)` — supprime le double envoi pour les documents expirant dans ≤7 jours
- `app/services/boat_document_service.ts` — `toReminderItem` : guard null sur `expiresAt` avant l'assertion ; `getExpiringDocuments(fromDaysAhead, toDaysAhead)` : borne inférieure `>=` (documents expirant aujourd'hui inclus)
- `inertia/components/boats/show/tabs/BoatShowTabAdminDocs.vue` — remplacement du `<button>` brut par `<BaseButton>` (convention projet)

**Correctifs importants**

- `database/migrations/1796000001000_add_index_boat_documents_expires_at.ts` — index sur `expires_at` (requête cron quotidienne)
- `app/validators/boat_document.ts` — factory `boatDocumentFields()` partagée entre create et update
- `app/services/reminder_email_service.ts` — injection de `BoatDocumentService` ; suppression de la requête et du mapping dupliqués ; utilisation de `getExpiringDocuments` + `toReminderItem`
- `app/transformers/boat_transformer.ts` + `app/controllers/boats_controller.ts` + `inertia/pages/boats/show.vue` — `canManageDocuments` découplé de `canManageEquipment`

**Suggestions appliquées**

- `shared/constants/boats/boat_document_constants.ts` — constante `BOAT_DOCUMENT_EXPIRY_WARNING_DAYS = 30` partagée entre service et job
- `inertia/components/base/BaseBadge.vue` — variante `danger` ajoutée ; `expired` → `'danger'` dans `statusVariant`
- `resources/views/emails/reminder_document_expiry.edge` — suppression du `.slice(0, 10)` redondant sur `expiresAt`

## 2026-06-19 — Documents administratifs bateau avec dates d'expiration et alertes #103

**Backend**

- `database/migrations/1796000000000_create_boat_documents_table.ts` — table `boat_documents` : `type` (enum), `custom_type_label`, `reference_number`, `issued_at`, `expires_at`, `issuer`, `media_id` (FK nullable → media), `notes`
- `app/models/boat_document.ts` — modèle Lucid avec relations `boat` et `media`
- `app/services/boat_document_service.ts` — CRUD + calcul du statut (valid / expiring_soon / expired) + `getExpiringDocuments(daysAhead)`
- `app/controllers/boat_documents_controller.ts` — routes POST/PUT/DELETE `/boats/:boatId/admin-documents[/:documentId]`
- `app/validators/boat_document.ts` — validation VineJS (type enum, dates nullable)
- `app/exceptions/boat_document_errors.ts` — `BoatDocumentNotFoundError`
- `shared/types/boat_document.ts` — types partagés : `BoatDocumentType`, `BoatDocumentRow`, `ReminderDocumentItem`
- `shared/constants/media.ts` — ajout de `'boat_document'` dans `MEDIA_ENTITY_TYPES`
- `app/services/reminder_email_service.ts` — `sendDocumentExpirationReminders(30|7)` : alertes email 30 j et 7 j avant expiration
- `app/services/email_queue_service.ts` — `sendReminderDocumentExpiry()` + template `reminder_document_expiry.edge`
- `app/jobs/send_reminder_emails.ts` — appel des deux nouvelles méthodes
- Types disponibles : francisation, assurance, permis de navigation, licence radio VHF, certificat de sécurité, jauge, certificat CE, rôle d'équipage, autre

**Frontend**

- Onglet "Documents admin." ajouté à la fiche bateau (`show.vue`) avec badge si des documents expirent bientôt / sont expirés
- `BoatShowTabAdminDocs.vue` — liste des documents avec statut coloré, actions modifier/supprimer
- `BoatAdminDocumentFormModal.vue` — modal création / édition (type, référence, dates, organisme, notes)
- Clés i18n ajoutées dans `fr/boats.json` et `en/boats.json` (namespace `adminDocs`)
- Flash messages `boatDocument.*` dans `fr/flash.json` et `en/flash.json`

## 2026-06-18 — Compte démo sandbox accessible sans inscription #96

**Backend**

- `database/seeders/sandbox_seeder.ts` — seeder dédié à l'organisation "Marina Démo" : 5 bateaux (voiliers + moteurs) avec équipements complets (moteurs, voiles, gréements) et historiques de maintenance (5 événements + tâches par bateau)
- `app/services/demo_service.ts` — service `DemoService` : `reset()` supprime l'org demo et re-seede, `ensureExists()` crée les données si absentes, `isDemoUser()` identifie le compte démo
- `app/jobs/reset_demo_data.ts` — job `ResetDemoData` pour le scheduler
- `app/controllers/demo_controller.ts` — route GET `/demo` : auto-login du compte démo sans saisie de credentials + redirection vers le dashboard
- `app/controllers/session_controller.ts` — au logout du compte démo, `DemoService.reset()` est déclenché (données remises à zéro)
- `start/routes/demo.ts` — route `/demo` protégée par rate limiting (5 req/min/IP)
- `start/limiter.ts` — throttle `demoThrottle` dédié
- `start/routes.ts` — import de `routes/demo.js`
- `start/scheduler.ts` — cron quotidien `0 4 * * *` (reset 4h du matin, Europe/Paris)
- `.env.example` — variables `DEMO_EMAIL` et `DEMO_PASSWORD`

**Frontend**

- `inertia/components/marketing/home/HomeDemoSection.vue` — nouveau CTA card "Essayer la démo" (accès instantané, sans inscription) en priorité sur la card "Réserver une démo guidée"
- `inertia/pages/marketing/home.vue` — types `PageProps` mis à jour (`tryDemoLabel`, `tryDemoSubtitle`) + binding des nouvelles props
- `resources/lang/fr/marketing.json` — clés `try_demo_label`, `try_demo_subtitle`
- `resources/lang/en/marketing.json` — idem en anglais

**Comportement de reset**

- À chaque logout du compte `demo@fleetai.app` : les données sont effacées et recréées
- Cron quotidien à 4h : reset de sécurité si personne ne s'est déconnecté
- Accès : GET `/demo` → connexion auto → dashboard avec 5 bateaux pré-remplis

---

## 2026-06-18 — Suppression bouton /careers inexistant — page About #94

**Frontend**

- `inertia/components/marketing/about/AboutTeamSection.vue` — suppression du `<BaseButton href="/careers">` qui produisait une 404 ; le hiring banner conserve son titre et sous-titre
- `shared/types/marketing.ts` — suppression du champ `hiringCta` du type `team`

**Backend**

- `app/controllers/marketing_controller.ts` — suppression de `hiringCta: t('team_hiring_cta')`
- `resources/lang/fr/marketing.json` + `resources/lang/en/marketing.json` — suppression des clés `team_hiring_cta`

---

## 2026-06-17 — Carnet d'entretien PDF — Pro & Enterprise #60

**Backend**

- `app/services/maintenance_log_pdf_service.ts` — génération PDF (PDFKit) : en-tête bateau, spécifications, historique chronologique des interventions avec pièces.
- `app/controllers/maintenance_log_pdf_controller.ts` — route `GET /boats/:id/maintenance-log.pdf`, vérifie `assertCanExport` (403→redirect pour plan Starter).
- `app/services/quota_service.ts` — ajout méthode `canExport(org): boolean` (lecture seule, sans lever d'exception).
- `start/routes/boats.ts` — route `boats.maintenanceLog.download`.
- `app/transformers/boat_transformer.ts` — prop `canExport` ajoutée dans `toShowProps` / `BoatShowContext`.

**Frontend**

- `inertia/pages/boats/show.vue` — prop `canExport`, bouton "Télécharger le carnet PDF" visible pour les orgs Pro/Enterprise.
- `inertia/types/boat_show.ts` — type `MaintenanceLogPdfProps`.
- `resources/lang/fr/boats.json` + `resources/lang/en/boats.json` — clés `boats.maintenanceLog.*`.

---

## 2026-06-17 — Fix : crash page Planning #86

**Frontend**

- `inertia/components/planning/PlanningTaskCard.vue` — remplacement de `:route="\`/boats/${task.boatId}\`"`par`route="boats.show" :params="{ id: task.boatId }"`sur`BaseButton`. La prop `route`attend un nom de route Tuyau, pas un chemin URL ; passer un chemin URL appelait`tuyau.getRoute('/boats/:id')`au rendu et levait`Error: Route /boats/:id not found`, faisant crasher toute la page Planning dès l'ouverture.
- `inertia/components/planning/PlanningCalendar.vue` — même correctif sur le bouton "Planifier" de la section tâches sans date.

---

## 2026-06-17 — White-label emails transactionnels avec branding org #81

**Backend**

- `shared/types/branding.ts` — ajout de `BrandingEmailParams` (`appName`, `primaryColor`, `logoUrl`).
- `app/services/branding_service.ts` — méthode `toEmailParams(org)` : retourne `BrandingEmailParams | null` (null si plan non-Enterprise).
- `app/services/email_queue_service.ts` — ajout du paramètre optionnel `branding?: BrandingEmailParams | null` sur les 11 méthodes org-spécifiques (`sendInvitation`, `sendStorageQuotaWarning`, `sendAiTokenQuotaWarning`, `sendPlanDowngradeNotification`, tous les `sendReminder*`). Le branding est passé à `edge.render()`.
- Callers mis à jour :
  - `app/controllers/organization_invitations_controller.ts` — passe `this.brandingService.toEmailParams(user.organization)`.
  - `app/listeners/send_storage_quota_notification.ts` — passe le branding de l'org de l'event.
  - `app/listeners/send_ai_token_quota_notification.ts` — idem.
  - `app/listeners/on_organization_plan_downgraded.ts` — idem.
  - `app/services/reminder_email_service.ts` — charge l'org par `Organization.find(orgId)` (en parallèle avec les admins) pour injecter le branding dans tous les reminders.

**Template**

- `resources/views/emails/_layout.edge` — header dynamique : `branding.primaryColor ?? '#1e3a5f'` pour la couleur, logo Cloudinary si `branding.logoUrl`, sinon `branding.appName ?? 'FleetAi'` en texte. Footer utilise `appName` avec fallback.

## 2026-06-17 — White-label branding core — Enterprise #80

**Backend**

- `database/migrations/1794000000000_add_branding_to_organizations.ts` — ajout des colonnes `logo_url`, `logo_public_id`, `primary_color`, `secondary_color`, `app_name` (nullable) sur la table `organizations`.
- `shared/types/branding.ts` — interfaces `BrandingConfig` et `BrandingUpdatePayload`.
- `shared/types/plan.ts` — ajout de `canWhiteLabel: boolean` dans `PlanQuotas` (false pour Starter & Pro, true pour Enterprise).
- `app/services/cloudinary_service.ts` — ajout du dossier `orgLogo` dans `CloudinaryFolders`.
- `app/services/branding_service.ts` — `uploadLogo` (remplace l'ancien logo sur Cloudinary), `deleteLogo`, `updateBranding` (couleurs + app_name), `toBrandingConfig`.
- `app/validators/branding.ts` — `updateBrandingValidator` (couleurs hex + app_name) et `uploadLogoValidator` (2 Mo, JPG/PNG/SVG/WebP).
- `app/policies/organization_policy.ts` — méthode `configureBranding` (accordée aux admins via `before()`).
- `app/controllers/settings_controller.ts` — méthodes `branding`, `updateBranding`, `uploadLogo`, `deleteLogo`.
- `start/routes/settings.ts` — routes `GET/PUT /settings/branding` + `POST/DELETE /settings/branding/logo`.
- `app/middleware/inertia_middleware.ts` — injection du `BrandingConfig` de l'organisation dans les props Inertia partagées (null si plan non-Enterprise).

**Frontend**

- `inertia/pages/settings/branding.vue` — page de configuration branding.
- `inertia/components/settings/tabs/SettingsBrandingTab.vue` — upload de logo (preview instantané), champs couleurs avec color picker natif, champ app_name, aperçu des couleurs en bande.
- `inertia/components/settings/SettingsShell.vue` — section "Marque blanche" ajoutée dans la nav pour les orgs Enterprise.
- `resources/lang/{fr,en}/settings.json` — clés `settings.sections.branding` et `settings.branding.*`.
- `resources/lang/{fr,en}/flash.json` — clés `settings.brandingUpdated`, `settings.logoUpdated`, `settings.logoDeleted`.

## 2026-06-17 — Regroupement automatique des tâches de maintenance — Pro & Enterprise #63

**Backend**

- `shared/types/plan.ts` — ajout de `canGroupTasks: boolean` dans `PlanQuotas` (false pour Starter, true pour Pro & Enterprise).
- `shared/types/planning.ts` — ajout de l'interface `TaskGroup` (`id`, `subject`, `boatId`, `boatName`, `tasks`, `earliestDueAt`, `latestDueAt`) et extension de `PlanningResult` avec `groups: TaskGroup[]` et `canGroupTasks: boolean`.
- `app/services/task_grouping_service.ts` — algorithme de clustering : regroupe les tâches par date (`kind === 'date'`, `status === 'open'`) qui partagent le même bateau et sujet, avec une fenêtre de proximité de 7 jours (balayage trié par `boatId → subject → dueAt`). Produit des groupes d'au moins 2 tâches.
- `app/services/planning_service.ts` — injection de `TaskGroupingService`, chargement de l'`Organization` pour lire le plan, calcul des groupes si `canGroupTasks`, exposition dans `PlanningResult`.
- `app/controllers/planning_controller.ts` — passage de `groups` et `canGroupTasks` à la vue Inertia.

**Frontend**

- Extraction de la page `planning/index.vue` (550 lignes → ~110 lignes) en 4 composants dédiés dans `inertia/components/planning/` :
  - `PlanningKanban.vue` — 4 colonnes Kanban avec support des groupes dans la colonne "Planifiées".
  - `PlanningCalendar.vue` — calendrier mensuel + agenda mobile + tâches sans date + tâches par heures.
  - `PlanningTaskCard.vue` — carte individuelle réutilisable (accent, badge, barré pour done).
  - `PlanningTaskGroup.vue` — carte pliable pour un groupe (sujet, plage de dates, bouton "Dissocier").
- `planning/index.vue` — toggle "Regroupement" (visible uniquement en Pro+), teaser upsell pour Starter, gestion des groupes dissociés en session (Set client-side).
- Comportement :
  - Le regroupement est activé par défaut et peut être désactivé via le toggle.
  - Les tâches groupées sont masquées des listes individuelles et affichées dans `PlanningTaskGroup`.
  - "Dissocier" retire le groupe de la vue pour la session courante.

**i18n** (FR + EN)

- `planning.grouping.toggle` — libellé du bouton toggle.
- `planning.grouping.toggleTitle` — title/tooltip du toggle.
- `planning.grouping.ungroup` — bouton de dissociation dans un groupe.
- `planning.grouping.proTeaser` — message d'incitation pour les plans Starter.

**Tests**

- `tests/unit/task_grouping_service.spec.ts` — 10 cas unitaires couvrant : entrée vide, tâche seule, regroupement dans la fenêtre, hors fenêtre (8 jours), sujets différents, bateaux différents, tâches par heures exclues, tâches done exclues, limite exacte de 7 jours, deux groupes indépendants.

---

## 2026-06-16 — Limite de tokens IA mensuelle — Pro (1M tokens/mois) #64

**Backend**

- Table `ai_token_usages` (`organization_id`, `month` YYYY-MM, `tokens_used`, `created_at`, `updated_at`) avec contrainte unique `(organization_id, month)`.
- `app/models/ai_token_usage.ts` — modèle Lucid avec relation `organization`.
- `app/services/ai_token_quota_service.ts` — `getUsage()`, `assertCanUseTokens()`, `recordUsage()` (upsert atomique + dispatch événement seuils 80%/100%), `resetMonth()`.
- `app/services/ai_service.ts` — `chat()` retourne maintenant `{ content, tokensUsed }` au lieu de `string`.
- `app/services/ai_analysis_service.ts` — `generateFleetAnalysis()` et `generateBoatSuggestions()` acceptent `org: Organization`, vérifient le quota avant appel, enregistrent les tokens consommés.
- `app/jobs/run_ai_chat.ts` — ajout de `organizationId` dans le payload, vérification quota + enregistrement usage dans `execute()`.
- `app/services/ai_queue_service.ts` — ajout de `organizationId` dans `enqueueChat()`.
- `app/jobs/reset_ai_token_usage.ts` — job de reset mensuel (1er du mois à 01h00 Europe/Paris) qui supprime les entrées du mois précédent.
- `app/events/ai_token_threshold_crossed.ts` + `app/listeners/send_ai_token_quota_notification.ts` — notification email aux admins à 80% et 100% du quota.
- `app/services/email_queue_service.ts` — ajout de `sendAiTokenQuotaWarning()`.
- `resources/views/emails/ai_token_quota_warning.edge` — template email FR+EN alerte tokens IA.
- `shared/types/plan.ts` — ajout de `aiTokensPerMonth` dans `PlanQuotas` (Pro = 1_000_000, Enterprise/Starter = null) et `aiTokens` dans `QuotaUsage`.
- `app/exceptions/quota_errors.ts` — ajout de `'ai_tokens'` dans `QuotaFeature`.
- `app/controllers/settings_controller.ts` — `billing()` expose `aiTokens.used` + `aiTokens.limit` dans `quotaUsage`.
- Routes AI inchangées — quota token check intégré dans les services existants.

**Frontend**

- `inertia/components/settings/tabs/SettingsBillingTab.vue` — jauge `SettingsBillingUsageGauge` pour les tokens IA, affichée uniquement si `canUseAI`.

**i18n** (FR + EN)

- `settings.billing.usage.aiTokens` — libellé jauge tokens IA.
- `flash.quota.aiTokensExceeded` — message flash quand le quota est dépassé.

---

## 2026-06-16 — Audit log — Pro (90 jours) & Enterprise (illimité) #71

**Backend**

- Table `audit_logs` (`organization_id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`) avec index sur `(organization_id, created_at)`.
- `app/models/audit_log.ts` — modèle Lucid avec relations `user` et `organization`.
- `app/services/audit_log_service.ts` — `log()`, `list()` (pagination + filtres), `purgeExpired()`, `canAccessAuditLog()`.
- `app/controllers/audit_logs_controller.ts` — `GET /settings/audit-log` (pagination, filtres user/action).
- `app/jobs/purge_audit_logs.ts` — job de purge quotidien à 03h00 (Europe/Paris) des logs expirés.
- `shared/types/plan.ts` — ajout de `auditLogRetentionDays` dans `PlanQuotas` : Starter = 0 (pas d'accès), Pro = 90 jours, Enterprise = null (illimité).
- `shared/types/audit_log.ts` — types `AuditAction`, `AuditLogEntry`, `AuditLogFilters`, `AuditLogPage`.
- Actions tracées : `login`, `logout`, `boat.create`, `boat.update`, `boat.delete`, `member.add`, `member.remove`, `member.update_role`.
- Route : `GET /settings/audit-log` (alias `settings.auditLog`), protégée par auth + `OrganizationPolicy.viewAuditLog`.

**Frontend**

- `inertia/pages/settings/audit_log.vue` — page Inertia avec shell settings.
- `inertia/components/settings/tabs/SettingsAuditLogTab.vue` — tableau avec filtres (utilisateur, action) et pagination.
- `SettingsShell.vue` — onglet "Journal d'activité" visible pour Pro et Enterprise uniquement.
- Clés i18n `settings.auditLog.*` ajoutées en FR et EN.

---

## 2026-06-16 — Refactor : event StorageThresholdCrossed pour découpler les notifications de quota stockage

**Backend**

- `app/events/storage_threshold_crossed.ts` (nouveau) — event `StorageThresholdCrossed` dispatché quand l'usage stockage franchit 80 % ou 100 % du quota.
- `app/listeners/send_storage_quota_notification.ts` (nouveau) — listener qui charge les admins de l'organisation et enqueue les emails via `EmailQueueService`.
- `app/services/quota_service.ts` — `updateStorageUsed` dispatche désormais `StorageThresholdCrossed.dispatch()` au lieu d'appeler `sendStorageQuotaNotification` directement ; suppression de `emailQueueService` comme dépendance du service.
- `start/events.ts` — wiring `StorageThresholdCrossed` → `SendStorageQuotaNotification`.

## 2026-06-16 — Correctifs post-code-review quota stockage

**Backend**

- `app/services/media_service.ts` — `deleteAllForEntity` accepte désormais `org?: Organization` : somme les bytes des médias avant suppression groupée et appelle `updateStorageUsed(org, -totalBytes)` après (corrigeait une dérive silencieuse du compteur lors de la suppression d'un bateau/moteur/pièce).
- `app/services/media_service.ts` — `logger.warn` si `org` est absent pour un `entityType !== 'user'` (détection en dev des oublis de passage d'organisation).
- `app/services/media_service.ts` — Commentaire explicitant la différence `file.size` (guard pre-upload) vs `uploaded.bytes` (compteur post-Cloudinary, après compression PDF éventuelle).
- `app/services/quota_service.ts` — Commentaire race condition sur `assertCanUpload` (symétrique avec le commentaire existant dans `updateStorageUsed`).
- `app/services/quota_service.ts` — Commentaire side effect `org.refresh()` dans `updateStorageUsed`.

**Email**

- `resources/views/emails/storage_quota_warning.edge` — Correction des accents manquants (`libéré`, `mis à jour`, `Gérer`).

**Tests**

- `tests/functional/quota/storage.spec.ts` — Suppression du test en doublon (`storage usage decrements correctly on deletion`, identique à `updateStorageUsed decrements storage_used_bytes on deletion`).

---

## 2026-06-16 — Comportement downgrade de plan

**Backend**

- `app/exceptions/quota_errors.ts` — `QuotaExceededError` enrichi d'un champ `alreadyOverLimit: boolean` pour distinguer "déjà au-dessus de la limite" (post-downgrade) de "cet upload dépasserait la limite".
- `app/services/quota_service.ts` — `assertCanUpload` vérifie d'abord `storageUsedBytes > limit` (pré-condition post-downgrade, throw avec `alreadyOverLimit: true`), puis `storageUsedBytes + bytes > limit` (cas normal).
- `app/exceptions/handler.ts` — Catch global de `QuotaExceededError` : flash `quota.storageOverflow` si `alreadyOverLimit`, sinon `quota.<feature>Exceeded`, puis redirect back. Couvre les routes upload non catchées localement.
- `app/services/subscription_service.ts` — `updateOrgPlan` détecte un downgrade (`PLAN_ORDER`) et émet l'event `OrganizationPlanDowngraded` après sauvegarde.
- `app/events/organization_plan_downgraded.ts` — Nouvel event avec `organization`, `fromPlan`, `toPlan`.
- `app/listeners/on_organization_plan_downgraded.ts` — Listener : envoie un email de notification à tous les admins de l'organisation via `EmailQueueService.sendPlanDowngradeNotification`.
- `app/services/email_queue_service.ts` — Nouvelle méthode `sendPlanDowngradeNotification` (bilingue FR/EN, déduplication par `orgId:fromPlan:toPlan:yyyy-MM`).
- `resources/views/emails/plan_downgrade.edge` — Template email de notification de downgrade.
- `start/events.ts` — Enregistrement du listener `OnOrganizationPlanDowngraded`.
- `resources/lang/{en,fr}/flash.json` — Clés `quota.storageExceeded` et `quota.storageOverflow` ajoutées.

**Frontend**

- `inertia/components/settings/tabs/SettingsBillingTab.vue` — Banner rouge si `storageUsedBytes > limitBytes` (post-downgrade).
- `resources/lang/{en,fr}/settings.json` — Clé `settings.billing.storageOverflow` ajoutée.

## 2026-06-16 — Correctifs code review : Quota de stockage (#72)

**Backend**

- `app/services/quota_service.ts` — Correctif : le décrément de `storage_used_bytes` est désormais plafonné à la valeur courante (`Math.min`) pour éviter un passage en négatif en cas d'incohérence de données. Commentaire ajouté sur la fenêtre de concurrence des notifications de seuil (déduplication assurée par `correlationSuffix` dans `EmailQueueService`). Ligne vide manquante après le constructeur.

**Frontend**

- `inertia/components/settings/SettingsBillingUsageGauge.vue` — Ko/Mo/Go remplacés par des clés i18n (`settings.billing.usage.kb/mb/gb`) afin d'afficher KB/MB/GB en anglais.
- `resources/lang/fr/settings.json` — Ajout des clés `kb`, `mb`, `gb` (Ko/Mo/Go).
- `resources/lang/en/settings.json` — Ajout des clés `kb`, `mb`, `gb` (KB/MB/GB).

**Tests**

- `tests/functional/quota/storage.spec.ts` — Test HTTP creux remplacé par des assertions Inertia réelles (`assertInertiaComponent` + `assertInertiaPropsContain`). Test dupliqué de décrément remplacé par un test couvrant le plancher à zéro (décrément supérieur à la valeur courante).

**Docs**

- `docs/changelog.md` — Correction des accents manquants sur les entrées du 2026-06-16.

---

## 2026-06-16 — Feature : Quota de stockage (#72)

**Backend**

- `shared/types/plan.ts` — Ajout de `storageGb: number | null` dans `PlanQuotas` (1 Go Starter, 20 Go Pro, null Enterprise). Ajout de `storage: { usedBytes: number; limitBytes: number | null }` dans `QuotaUsage`.
- Migration `1791000000000_add_storage_to_organizations.ts` — Colonne `storage_used_bytes` (bigint, default 0) sur la table `organizations`.
- `database/schema.ts` — Ajout du champ `storageUsedBytes` dans `OrganizationSchema`.
- `app/exceptions/quota_errors.ts` — Ajout de `'storage'` dans le type `QuotaFeature`.
- `app/services/quota_service.ts` — Nouvelles méthodes `storageLimitBytes()`, `assertCanUpload()`, `updateStorageUsed()`. Détection des seuils 80%/100% pour envoi d'email de notification aux admins.
- `app/services/media_service.ts` — Modification de `upload()` et `deleteById()` pour accepter un paramètre `org` optionnel. Vérification du quota avant upload et mise à jour du compteur après upload/suppression.
- `app/services/email_queue_service.ts` — Nouvelle méthode `sendStorageQuotaWarning()` pour notifier les admins.
- `app/controllers/boat_media_controller.ts` — Passage de l'organisation a `upload()` et `deleteById()` pour le tracking du stockage.
- `app/controllers/boat_engine_parts_controller.ts` — Idem pour les documents de pieces moteur.
- `app/controllers/settings_controller.ts` — Ajout de `storage` dans `quotaUsage` pour la page billing.
- `resources/views/emails/storage_quota_warning.edge` — Template email bilingue pour les alertes de quota.

**Frontend**

- `inertia/components/settings/SettingsBillingUsageGauge.vue` — Nouveau composant generique pour les jauges d'usage (boats, members, storage).
- `inertia/components/settings/tabs/SettingsBillingTab.vue` — Utilisation du nouveau composant jauge et ajout de la jauge stockage avec formatage bytes (Ko/Mo/Go).

**i18n** — Cle `settings.billing.usage.storage` ajoutee (FR + EN).

**Tests** — `tests/functional/quota/storage.spec.ts` pour les tests du quota de stockage.

---

## 2026-06-16 — Feature : Personnalisation du modèle IA pour Enterprise (#70)

**Backend**

- `shared/types/plan.ts` — Ajout de `canCustomizeAI: boolean` dans `PlanQuotas` ; valeur `true` uniquement pour le plan Enterprise.
- Migration `1790000000000_add_ai_settings_to_organizations.ts` — Colonnes `ai_system_prompt` (text, nullable) et `ai_model_override` (varchar 100, nullable) sur la table `organizations`.
- `app/validators/user.ts` — `updateAiSettingsValidator` : `aiSystemPrompt` (max 2 000 car., nullable) + `aiModelOverride` (enum parmi `mistral-small-latest`, `mistral-medium-latest`, `mistral-large-latest`, nullable).
- `app/services/ai_analysis_service.ts` — `generateFleetAnalysis()` et `generateBoatSuggestions()` acceptent un `orgSystemPrompt?` optionnel qui est préfixé au prompt système existant.
- `app/controllers/ai_controller.ts` — Passe `user.organization.aiSystemPrompt` à chaque appel `generateFleetAnalysis` / `generateBoatSuggestions`.
- `app/controllers/settings_controller.ts` — Méthodes `ai()` (GET) et `updateAiSettings()` (PUT) ; redirection vers `/settings/billing` si le plan n'est pas Enterprise.
- `start/routes/settings.ts` — Routes `GET /settings/ai` (`settings.ai`) et `PUT /settings/ai` (`settings.ai.update`).

**Frontend**

- `inertia/components/settings/tabs/SettingsAiTab.vue` — Formulaire de configuration : textarea pour le prompt système, select pour le modèle.
- `inertia/pages/settings/ai.vue` — Page settings onglet IA.
- `inertia/components/settings/SettingsShell.vue` — Section « Personnalisation IA » visible uniquement si `PLAN_LIMITS[currentPlan].canCustomizeAI`.

**i18n** — Clés `settings.ai.*` et `settings.sections.ai` ajoutées (FR + EN). Message flash `settings.aiSettingsUpdated` ajouté (FR + EN).

---

## 2026-06-15 — Fix : calendrier planning non responsive sur mobile (#53)

**Vue agenda sur mobile — `inertia/pages/planning/index.vue`**

Sur mobile (`< sm`), la grille 7 colonnes fixe du calendrier compressait chaque colonne à ~45px, rendant les événements illisibles. Ajout d'une vue agenda/liste pour les écrans mobiles : les jours du mois courant ayant des tâches sont affichés en liste verticale avec numéro de jour, étiquette courte du jour et toutes les tâches cliquables. La grille 7 colonnes est conservée à partir de `sm`. Nouvelle clé i18n `planning.calendar.agendaEmpty` (FR + EN) pour l'état vide.

## 2026-06-15 — Fix : drag-and-drop tactile sur MarinaCanvas (#47)

**Support touch/mobile — `MarinaCanvas.vue` / `MarinaPontoon.vue` / `MarinaMouillage.vue`**

Le canvas de plan de port utilisait exclusivement des événements souris (`mousedown`, `mousemove`, `mouseup`), rendant le drag-and-drop inutilisable sur mobile et tablette. Migration vers l'API **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`), qui unifie souris, touch et stylet sans code conditionnel. `setPointerCapture` est appelé au début du drag pour garantir la réception des événements `pointermove` même si le doigt quitte la zone SVG. `touch-action: none` sur le SVG empêche le scroll navigateur pendant le drag. Les sous-composants `MarinaPontoon` et `MarinaMouillage` émettent désormais `pointerdown` au lieu de `mousedown`.

## 2026-06-15 — Fix : navigation mobile absente dans le header public (#46)

**Correctif mobile — `AppHeader.vue` / `AppHeaderMobileDrawer.vue`**

Sur mobile (< 768 px), la nav principale (`Features`, `Pricing`, `Guide`) était masquée sans alternative. Ajout d'un bouton hamburger (visible uniquement sous `md:`) qui ouvre un drawer latéral droit. Le drawer expose les mêmes liens que la nav desktop, un sélecteur de langue et les CTA Login / S'inscrire. Fermeture via overlay cliquable, touche Escape, ou navigation Inertia. La logique du drawer est extraite dans `AppHeaderMobileDrawer.vue` pour respecter la limite de 250 lignes par composant. Les boutons Login / S'inscrire sont masqués en desktop dans la barre d'actions lorsque le hamburger est présent.

## 2026-06-15 — Fix : home publique — sections invisibles à cause du scroll-reveal brisé (#40)

**Correctif UX — Page d'accueil publique (`/en`, `/fr`)**

Toutes les sections sous le hero (`HomeProblemSection`, `HomePillarsSection`, `HomeFeatureSection` ×3, `HomePersonasSection`, `HomeStatsBandSection`, `HomeComparisonSection`, `HomeTestimonialsSection`, `HomeSecuritySection`, `HomeFaqSection`) restaient à `opacity: 0` : le composable `useScrollReveal` utilisait `IntersectionObserver` sur une ref qui n'était jamais connectée au DOM.

Cause : le pattern `:ref="(el) => (sectionEl = el as HTMLElement)"` réassigne la variable locale sans mettre à jour `sectionEl.value`, donc l'observer ne recevait jamais l'élément cible.

Fix : remplacement de ce pattern par `:ref="sectionEl"` (Vue gère automatiquement `sectionEl.value = el`) dans les 26 occurrences réparties sur 14 composants de `inertia/components/marketing/home/`.

## 2026-06-15 — Dashboard : stat-cards enrichies — prop delta, liens cliquables, icônes (#39)

**Amélioration UX — Dashboard**

Les 5 stat-cards du dashboard affichaient uniquement un chiffre sans contexte. La prop `delta` (déjà présente dans `BaseStatCard` mais jamais alimentée) est maintenant renseignée depuis le service.

- **`shared/types/dashboard.ts`** : ajout du type `DashboardStatDeltas` (5 compteurs contextuels) et du champ `deltas` dans `DashboardStats`
- **`app/services/dashboard_service.ts`** : calcul des deltas — `boatsInAlert` (bateaux avec maintenance urgente), `boatsWithEngine/Sail/Rig` (bateaux équipés), `overdueCount` (tâches en retard)
- **`inertia/components/base/BaseStatCard.vue`** : ajout prop `href` (rend la carte cliquable via `<a>`) + slot `#icon` pour icône contextuelle
- **`inertia/pages/dashboard.vue`** : chaque carte reçoit `delta`, `href` (/boats ou /planning) et une icône SVG (bateau, engrenage, voile, mât, clé)
- **i18n** : 10 nouvelles clés `dashboard.stats.delta.*` dans `fr/dashboard.json` et `en/dashboard.json`

## 2026-06-15 — Design : unification tokens couleur — suppression des namespaces `abyss` et `lagoon` (#35)

**Refactoring — Design system / CSS**

Triple système de tokens couleur fragmenté (navy / abyss / lagoon pointant vers les mêmes teintes) remplacé par un seul namespace `navy` étendu. La palette `navy` passe de 7 à 11 shades (ajout de 400, 300, 200, 25) pour couvrir toutes les teintes précédemment définies sous `abyss-*` et `lagoon-*`. Tous les composants et pages Inertia migrent vers `navy-*` selon la correspondance exacte des valeurs hex. Aucun changement visuel.

- **`inertia/css/app.css`** : palette `navy` étendue (900→25), blocs `abyss` et `lagoon` supprimés
- **Composants** (`default.vue`, `AsideMenu`, `LanguageSwitcher`, `PublicFooter`, `Logo`, `BaseModal`, `BoatOverviewAiPanel`, `EngineShowTabOverview`, `HomeComparisonSection`, `HomeContentSections`) : `abyss-X` → `navy-Y`, `lagoon-X` → `navy-Y`
- **Pages** (`dashboard`, `planning/index`, `marketing/guide`) : idem

## 2026-06-15 — Fix i18n : drawer mobile — texte hardcodé remplacé par t() (#34)

**Correctif — i18n / Layout**

Le drawer de navigation mobile dans `inertia/layouts/default.vue` affichait du texte hardcodé en français (sections FLOTTE, MAINTENANCE, PREFERENCES ; items Dashboard, Mes bateaux, Planning, Historique, Reglages, Deconnexion) sans passer par `t()`. Résultat : le drawer restait en français même en anglais.

- Création du composable `inertia/composables/use_nav_sections.ts` — source unique des sections de nav avec `t()` (partagée entre `AsideMenu` et le drawer)
- Création du composant `inertia/components/layout/NavIcon.vue` — icônes SVG extraites pour éliminer la duplication
- Refactorisation de `AsideMenu.vue` pour utiliser le composable + `NavIcon`
- Remplacement dans `default.vue` de tous les textes hardcodés : sections via `navSections`, `aria-label` via `t('nav.closeMenu')`, fallback utilisateur via `t('nav.unknownUser')`, déconnexion via `t('nav.logout')`
- Ajout de la clé `nav.closeMenu` dans `resources/lang/fr/nav.json` et `en/nav.json`

## 2026-06-15 — Fix : redirections pour /maintenance et /organization (#32)

**Correctif — Router**

Les routes `/maintenance` et `/organization` renvoyaient une erreur 500 car elles n'étaient pas définies. Ajout de redirections permanentes : `/maintenance` → `/maintenance/history` et `/organization` → `/organization/members`.

## 2026-06-15 — Fix BaseStatCard : badge affiche le label i18n au lieu du nom de l'enum (#31)

**Correctif — BaseStatCard**

Le badge affiché en haut à droite de chaque stat-card affichait le nom brut de l'enum (`neutral`, `info`, `success`, `warning`) au lieu d'un libellé localisé. Ajout des clés `common.tone.*` dans `resources/lang/{fr,en}/common.json` et utilisation de `t('common.tone.' + tone)` dans `BaseStatCard.vue`.

## 2026-06-15 — Fix rendu des templates email Edge v6 (#27)

**Correctif — Migration syntaxe templates Edge**

Les directives `@layout`, `@section` et `@end` de Edge v5 n'existent plus en Edge.js v6 et s'affichaient en texte brut dans les emails reçus. Migration des 13 templates email (`resources/views/emails/*.edge`) vers la syntaxe composants Edge v6 : `@component('emails/_layout')` + `@slot('content')` + `@end`. Mise à jour du layout `_layout.edge` : `@!section('content')` → `{{{ await $slots.content() }}}`.

## 2026-06-14 — Benchmark anonymisé avec comparaison en pourcentage dans les résultats du simulateur (#13)

**Amélioration — Social proof dans SimulatorResultCard**

Affichage d'un encart comparatif sous le total estimé dans les résultats du simulateur. Le delta entre le coût de l'utilisateur et la moyenne anonymisée des bateaux similaires est calculé et présenté sous forme de message contextuel.

**Frontend (`inertia/components/marketing/simulator/SimulatorResultCard.vue`) :**

- Computed `benchmarkComparison` : calcule le pourcentage de différence entre `(totalMin+totalMax)/2` et `(benchmark.avgMin+benchmark.avgMax)/2`
- Trois clés utilisées selon le delta : `benchmark_above` (> +5%), `benchmark_below` (< −5%), `benchmark_similar` (±5%)
- La fourchette moyenne (avgMin – avgMax) reste affichée en secondaire

**i18n (FR + EN) :**

- Ajout des clés `benchmark_above`, `benchmark_below`, `benchmark_similar` avec params `{percent}` et `{count}`

**Tests (`tests/inertia/simulator_step_costs.spec.ts`) :** 4 nouveaux cas couvrant les trois branches de comparaison et l'absence du bloc quand aucun benchmark n'est fourni.

## 2026-06-12 — Séquence email J+0/J+3/J+7 après capture lead simulateur (#12)

**Nouvelle fonctionnalité — Nurturing leads simulateur**

Mise en place de l'architecture Event/Listener/Jobs pour l'envoi automatique de 3 emails après création d'un `SimulatorLead`.

**Backend :**

- `app/events/simulator_lead_created.ts` : event `SimulatorLeadCreated extends BaseEvent`, émis dans `SimulatorLeadService.create` via `SimulatorLeadCreated.dispatch(lead)`
- `app/listeners/on_simulator_lead_created.ts` : dispatche `SendSimulatorReportJob` et `SendSimulatorNurturingJob` à la réception de l'event
- `app/jobs/send_simulator_report_job.ts` : email J+0 — rapport de coûts complet par catégorie (coque, moteur, sécurité, électrique, mouillage, gréement), bilingue FR/EN selon `lead.locale`, template `emails/simulator_report.edge`
- `app/jobs/send_simulator_nurturing_job.ts` : email J+3 (3 conseils pour réduire les coûts, `.in('3d')`) + email J+7 (rappel estimation avec CTA inscription, `.in('7d')`), bilingue FR/EN, templates `emails/nurturing_d3.edge` et `emails/nurturing_d7.edge`
- `start/events.ts` : enregistrement du binding `emitter.listen(SimulatorLeadCreated, [lazy import listener])`, préchargé via `adonisrc.ts`
- Dedup par `correlationId` sur chaque email — évite les doublons en cas de re-soumission du formulaire

**Refactor :**

- `EmailQueueService` : suppression des méthodes `sendSimulatorReport` et `sendSimulatorNurturing` (logique déplacée dans les Jobs dédiés)
- `SimulatorLeadService` : ne dépend plus d'`EmailQueueService` ; délègue via l'event

---

## 2026-06-11 — Relances maintenance — tâches en retard, moteur, inspection bateau (PR 3/3)

**Nouvelle fonctionnalité — Alertes maintenance**

Implémentation des 3 relances maintenance dans `ReminderEmailService`.

**Backend :**

- `sendOverdueTaskReminders()` : tâches ouvertes avec `dueAt < aujourd'hui` → email aux admins de chaque organisation avec la liste des tâches en retard (toutes catégories)
- `sendEngineTaskReminders()` : tâches ouvertes avec `subject = 'engine'` et `dueAt` dans les 30 prochains jours → email de rappel moteur par admin
- `sendBoatCheckReminders()` : tâches ouvertes avec `subject = 'boat'` et `dueAt` dans les 30 prochains jours → email d'inspection bateau par admin
- `EmailQueueService` : 3 nouvelles méthodes (`sendReminderOverdueTasks`, `sendReminderEngineTasks`, `sendReminderBoatCheckTasks`) avec templates HTML bilingues (FR/EN), tableau tâche/bateau/échéance, CTA vers `/maintenance`
- Jointure via `preload('boat')` pour récupérer `organizationId` et grouper les tâches par organisation
- Dedup par `correlationId` incluant les IDs des tâches — évite les doublons quotidiens

---

## 2026-06-11 — Relances utilisateur — compte inactif, bateaux/ports incomplets, inactivité (PR 2/3)

**Nouvelle fonctionnalité — Rétention utilisateur**

Implémentation des 4 relances liées au cycle de vie utilisateur dans `ReminderEmailService`.

**Backend :**

- `sendInactiveAccountReminders()` : organisations sans bateau créées il y a > 7 jours → email aux admins pour ajouter leur flotte
- `sendIncompleteBoatReminders()` : bateaux avec ≥ 3 champs clés null (type, immatriculation, longueur, année, fabricant, modèle) → email groupé par admin avec liste des bateaux à compléter
- `sendIncompletePortReminders()` : ports sans ville ou sans pays → email groupé par admin avec liste des ports à compléter
- `sendInactiveLoginReminders()` : utilisateurs sans connexion depuis > 30 jours → email de réengagement individuel
- `EmailQueueService` : 4 nouvelles méthodes d'envoi (`sendReminderInactiveAccount`, `sendReminderIncompleteBoats`, `sendReminderIncompletePorts`, `sendReminderInactiveLogin`) avec templates HTML bilingues (FR/EN) et dedup
- Ciblage admin via `OrganizationMembership` (role `admin`) — 1 email par admin avec liste groupée
- Dédup par `correlationId` incluant les IDs des éléments concernés — évite les doublons quotidiens

---

## 2026-06-11 — Infrastructure emails de relance (PR 1/3)

**Nouvelle fonctionnalité — Rétention utilisateur**

Pose les fondations pour les emails de relance automatiques envoyés quotidiennement.

**Backend :**

- Migration : `last_login_at` ajouté sur la table `users` (nullable)
- Tracking : `lastLoginAt` mis à jour à chaque connexion (`SessionController.store`) et création de compte (`NewAccountController.store`)
- `app/services/reminder_email_service.ts` : service orchestrateur avec 7 méthodes (squelettes) — `sendInactiveAccountReminders`, `sendIncompleteBoatReminders`, `sendIncompletePortReminders`, `sendInactiveLoginReminders`, `sendOverdueTaskReminders`, `sendEngineTaskReminders`, `sendBoatCheckReminders`
- `app/jobs/send_reminder_emails.ts` : job queue `emails` qui exécute toutes les relances en séquence
- `start/scheduler.ts` : planification cron quotidienne à 08h00 (Europe/Paris), id `daily-reminder-emails`
- `shared/types/reminder.ts` : types partagés (`ReminderKind`, `ReminderTaskItem`, `ReminderBoatItem`, `ReminderPortItem`)
  Implémentation des 4 relances liées au cycle de vie utilisateur dans `ReminderEmailService`.

**Backend :**

- `sendInactiveAccountReminders()` : organisations sans bateau créées il y a > 7 jours → email aux admins pour ajouter leur flotte
- `sendIncompleteBoatReminders()` : bateaux avec ≥ 3 champs clés null (type, immatriculation, longueur, année, fabricant, modèle) → email groupé par admin avec liste des bateaux à compléter
- `sendIncompletePortReminders()` : ports sans ville ou sans pays → email groupé par admin avec liste des ports à compléter
- `sendInactiveLoginReminders()` : utilisateurs sans connexion depuis > 30 jours → email de réengagement individuel
- `EmailQueueService` : 4 nouvelles méthodes d'envoi (`sendReminderInactiveAccount`, `sendReminderIncompleteBoats`, `sendReminderIncompletePorts`, `sendReminderInactiveLogin`) avec templates HTML bilingues (FR/EN) et dedup
- Ciblage admin via `OrganizationMembership` (role `admin`) — 1 email par admin avec liste groupée
- Dédup par `correlationId` incluant les IDs des éléments concernés — évite les doublons quotidiens

---

---

## 2026-06-09 — Email capture simulateur (lead magnet)

**Nouvelle fonctionnalité — Acquisition**

Capture l'email des visiteurs qui ont vu leurs résultats de simulation mais ne sont pas prêts à créer un compte.

**Backend :**

- Table `simulator_leads` (UUID, email unique, données du simulateur, fourchette de coût, locale)
- Model `SimulatorLead`, service `SimulatorLeadService` (upsert sur email), controller `SimulatorLeadController`
- Validator VineJS `simulatorLeadValidator`
- Route : `POST /simulator/lead` → `simulator.lead` (publique, sans auth)

**Frontend :**

- `SimulatorCtaCard.vue` : second CTA "Recevoir ce rapport par email" affiché sous le bouton principal (visiteurs non authentifiés uniquement), séparé par un divider "ou", avec message de confirmation inline après soumission
- Prop `breakdown` ajoutée à `SimulatorCtaCard` pour passer `totalMin`/`totalMax`

**i18n :** clés `cta_or_divider`, `cta_email_title`, `cta_email_placeholder`, `cta_email_button`, `cta_email_success`, `cta_email_rgpd` dans `simulator.json` (FR + EN)

---

## 2026-06-06 — Page guide SEO coût d'entretien + simulateur flotte

**Nouvelle fonctionnalité — SEO organique + simulateur authentifié**

### Page guide "Coût d'entretien d'un bateau"

Page de contenu SEO riche ciblant les requêtes organiques sur le coût d'entretien annuel d'un bateau. Alimente un tunnel vers le simulateur public.

**Routes :**

- `GET /fr/cout-entretien-bateau` → `marketing.fr.guide`
- `GET /en/boat-maintenance-cost` → `marketing.en.guide`

**Sections :** Hero + stats clés + catégories de coûts + tableau comparatif par type/longueur + FAQ accordion + CTA simulateur + contexte réglementaire Division 240.

**SEO :** FAQPage JSON-LD (schema.org) embarqué dans `<Head>` pour rich results Google. Balises canonical + hreflang.

**Navigation :** Lien "Guide entretien" / "Maintenance guide" ajouté dans le header public et le footer.

**Fichiers créés :**

- `inertia/pages/marketing/guide.vue` — page guide (174 lignes)
- `inertia/components/marketing/guide/GuideCostTable.vue` — tableau coûts responsive
- `inertia/components/marketing/guide/GuideFaqSection.vue` — accordion FAQ
- `resources/lang/fr/marketing.json` — section `guide` (73 clés)
- `resources/lang/en/marketing.json` — section `guide` (73 clés)

**Simulateur enrichi :** Section "Comment ça marche" (3 étapes) ajoutée avant le formulaire sur la page simulateur public.

### Simulateur de coût sur bateau existant (flotte authentifiée)

Permet à un utilisateur connecté de relancer le simulateur de coût d'entretien sur un bateau déjà dans sa flotte, avec les données de base pré-remplies.

**Routes :**

- `GET /boats/:id/simulator` → `boats.simulator` (auth requis)

**Comportement :** Type, longueur, année, catégorie CE pré-remplis depuis la fiche bateau. Seules les étapes d'usure (coque, moteur, sécurité, gréement) sont présentées. Calcul client-side sans persistance. Résultat avec bouton retour fiche bateau.

**Accès :** Bouton "Estimer les coûts d'entretien" dans l'onglet Aperçu de la fiche bateau.

**Fichiers créés :**

- `app/controllers/boat_simulator_controller.ts` — contrôleur avec bouncer `BoatPolicy.view`
- `inertia/pages/boats/simulator.vue` — page simulateur flotte (layout app)

---

## 2026-06-06 — Simulateur de coût d'entretien (acquisition publique)

**Nouvelle fonctionnalité — outil public / stratégie d'acquisition**

### Simulateur de coût annuel d'entretien

Page publique (sans authentification) permettant à tout propriétaire de bateau d'estimer son budget annuel d'entretien en 2 minutes. Basé sur la réglementation Division 240 – Annexe 240-A.2.

**Tunnel de conversion :**

1. L'utilisateur remplit les données de son bateau (type, longueur, âge, catégorie CE) et l'état de ses équipements (coque, moteur, sécurité, gréement)
2. Un coût estimé par catégorie (fourchette min/max) est calculé côté frontend sans appel serveur
3. Un CTA incite l'utilisateur à créer un compte — les données du bateau sont stockées en session
4. Après inscription, le bateau est automatiquement créé et l'utilisateur est redirigé vers la fiche de son bateau

**Routes :**

- `GET /fr/simulateur-cout-entretien` → `marketing.fr.simulator`
- `GET /en/maintenance-cost-simulator` → `marketing.en.simulator`
- `POST /simulator/session` → stockage en session + redirect signup

**Fichiers créés :**

- `shared/types/simulator.ts` — types `SimulatorBoatInput`, `SimulatorCostBreakdown`
- `app/validators/simulator.ts` — validation VineJS des données du simulateur
- `app/controllers/simulator_controller.ts` — `saveSession()`
- `inertia/composables/use_simulator_costs.ts` — calcul des coûts par catégorie
- `inertia/components/marketing/simulator/` — 7 composants (étapes + résultat + CTA)
- `inertia/pages/marketing/simulator.vue` — page multi-étapes

**Fichiers modifiés :**

- `app/controllers/marketing_controller.ts` — méthode `simulator()`
- `app/services/boat_hull_service.ts` — méthode `createFromSimulator(orgId, data)`
- `app/controllers/new_account_controller.ts` — auto-création du bateau depuis la session post-inscription
- `start/routes/marketing.ts` — routes simulateur
- `resources/lang/{fr,en}/marketing.json` — clés `marketing.simulator.*`
- `resources/lang/{fr,en}/public.json` — lien footer "Simulateur de coût"
- `inertia/layouts/public.vue` — lien footer ajouté

---

## 2026-06-01 — Gestion avancée des pièces et suivi des coûts de maintenance

**Nouvelles fonctionnalités**

### Liaison pièces de maintenance → catalogue moteur

- Champ `engine_part_id` (FK nullable) ajouté sur `boat_maintenance_parts` → lien vers `boat_engine_parts`
- Relation `belongsTo` ajoutée dans `BoatMaintenancePart` → `BoatEnginePart`
- Champ `enginePartId` accepté dans le payload `parts[]` du formulaire de création d'événement de maintenance
- Lors de la création d'un événement, si une pièce référence une pièce du catalogue :
  - Le stock est décrémenté automatiquement (en transaction)
  - Si le stock atteint 0, le `wearState` passe à `to_replace` (sauf si `damaged`)

### Suivi des coûts de maintenance

- Champ `unit_price` (decimal 10,2) ajouté sur `boat_maintenance_parts`
- Champ `unitPrice` accepté dans le payload `parts[]`
- `getHistoryForOrg` retourne `totalCost` par événement et dans les statistiques globales
- Type `MaintenanceEventPartRow` et `MaintenanceEventRow` ajoutés dans `shared/types/maintenance.ts`
- Clés i18n ajoutées : `maintenance.history.stats.totalCost`, `maintenance.history.timeline.totalCost/unitPrice/fromCatalog` (EN + FR)

### Seuil d'alerte de stock minimum sur les pièces moteur

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

## 2026-06-01 — États d'usure et documents sur les pièces moteur

**Nouvelles fonctionnalités**

- Champ `wear_state` ajouté sur `boat_engine_parts` : valeurs `new | good | worn | to_replace | damaged`, optionnel (défaut `good`)
- Les pièces moteur peuvent désormais avoir des documents attachés (PDF, CSV, XLSX, DOCX) via le système Media polymorphique (`entityType: 'boat_engine_part'`)
- Nouvelle page dédiée `/boats/:boatId/engines/:engineId/parts/:partId` avec deux onglets : **Informations** et **Documents**
- Bouton « Voir » dans le tableau des pièces de la page moteur → redirige vers la page pièce
- Colonne « État d'usure » (badge coloré) dans le tableau des pièces
- Sélecteur d'état d'usure dans le modal d'ajout/modification de pièce
- Clés i18n ajoutées dans `equipment.wearState` (EN + FR) et `boats.engineShow.parts.wearState/view` + `boats.engineShow.partShow` (EN + FR)

**Routes ajoutées**

- `GET  /boats/:boatId/engines/:engineId/parts/:partId` → `BoatEnginePartsController.show`
- `POST /boats/:boatId/engines/:engineId/parts/:partId/documents` → `storeDocument`
- `DELETE /boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId` → `destroyMedia`
- `GET  /boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId/download` → `downloadMedia`

**Dossier Cloudinary** : `organizations/{slug}/boats/{id}/engines/{id}/parts/{id}/documents`

## 2026-05-25 — Correctifs et config Stripe

**Correctifs backend**

- `SubscriptionService.syncFromCheckoutSession` : `session.subscription` était casté en `Stripe.Subscription` alors que c'est un simple ID string → corrigé par un appel `stripeService.retrieveSubscription()` pour récupérer l'objet complet avec `expand: ['items.data.price']`
- Route `/webhooks/stripe` exclue de la protection CSRF Shield (`config/shield.ts → exceptRoutes`)

**Variables d'environnement requises**

| Variable                             | Description                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Clé secrète Stripe (`sk_live_...` en prod, `sk_test_...` en dev) |
| `STRIPE_WEBHOOK_SECRET`              | Secret de signature webhook (`whsec_...`)                        |
| `STRIPE_PUBLIC_KEY`                  | Clé publique (`pk_live_...` / `pk_test_...`)                     |
| `STRIPE_PRO_MONTHLY_PRICE_ID`        | Price ID Stripe mensuel Pro (`price_...`)                        |
| `STRIPE_PRO_ANNUAL_PRICE_ID`         | Price ID Stripe annuel Pro (`price_...`)                         |
| `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` | Price ID Stripe mensuel Enterprise (`price_...`)                 |
| `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID`  | Price ID Stripe annuel Enterprise (`price_...`)                  |
| `STRIPE_CUSTOMER_PORTAL_ID`          | ID de configuration du Customer Portal (`bpc_...`, optionnel)    |

⚠️ Les Price IDs commencent par `price_` (pas `prod_` qui sont des Product IDs).

**Config webhook en production**

1. Dashboard Stripe → **Webhooks** → **Add endpoint** : `https://ton-domaine.com/webhooks/stripe`
2. Events à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copier le `whsec_...` affiché → `STRIPE_WEBHOOK_SECRET` dans les env de prod
4. Le `whsec_` du CLI (`stripe listen`) est différent de celui du dashboard — ne pas les mélanger

**Dev local**

```bash
stripe login                  # si clé CLI expirée
stripe listen --forward-to localhost:5555/webhooks/stripe
# copier le whsec_ affiché → STRIPE_WEBHOOK_SECRET dans .env
```

Cartes de test : `4242 4242 4242 4242` (succès), `4000 0000 0000 0002` (refusée), `4000 0025 0000 3155` (3DS)

---

## 2026-05-23 — Intégration Stripe — paiement par abonnement

Mise en place du flux de paiement complet via Stripe Billing.

**Backend**

- Nouvelles tables : `subscriptions` (état de l'abonnement Stripe), colonne `stripe_customer_id` sur `organizations`
- `StripeService` : création/récupération du customer Stripe, Checkout Session, Customer Portal Session, vérification de signature webhook
- `SubscriptionService` : synchronisation de l'abonnement depuis les événements Stripe (`checkout.session.completed`, `customer.subscription.updated/deleted`), mise à jour automatique de `organizations.plan`
- `BillingController` : routes POST `/settings/billing/checkout` (→ Stripe Checkout), POST `/settings/billing/portal` (→ Customer Portal), POST `/webhooks/stripe` (webhook public)
- Le plan `organizations.plan` est mis à jour automatiquement par les webhooks Stripe

**Frontend**

- Page `/settings/billing` : prop `subscription` (statut, date de renouvellement, intervalle)
- Sélecteur mensuel/annuel avant le checkout
- Badge de statut abonnement (actif, en retard…) + date de renouvellement
- Bouton "Gérer mon abonnement" → Customer Portal Stripe

**Routes**

- `POST /settings/billing/checkout` — `settings.billing.checkout`
- `POST /settings/billing/portal` — `settings.billing.portal`
- `POST /webhooks/stripe` — `webhooks.stripe` (public, hors auth)

## 2026-05-23 — Mise à jour tarifaire : plan Pro à 20 €/mois

Révision des tarifs du plan Pro. Le modèle reste par organisation (pas par bateau ni par utilisateur).

| Plan       | Mensuel     | Annuel (−20 %)         |
| ---------- | ----------- | ---------------------- |
| Starter    | Gratuit     | Gratuit                |
| Pro        | 20 € / mois | 16 € / mois (192 €/an) |
| Enterprise | Sur devis   | Sur devis              |

**Fichiers mis à jour :**

- `resources/lang/fr/marketing.json` — prix carte Pro, tableau comparatif, meta description, FAQ (×2)
- `resources/lang/en/marketing.json` — idem en anglais
- `docs/quotas.md` — section Tarifs ajoutée

---

## 2026-05-23 — Enforcement quotas : retour utilisateur anticipé (bateaux)

Amélioration UX : le blocage quota sur l'ajout de bateau remonte désormais au plus tôt, avant toute navigation.

**4 niveaux de guards pour l'ajout de bateau (defense in depth) :**

1. **Icône cadenas dans le bouton** (`inertia/pages/boats/index.vue`) — signal visuel avant tout clic ; `canAddBoat: false` → `LockClosedIcon` affiché dans le bouton "Nouveau bateau"
2. **Toast au clic** — `handleNewBoat()` intercepte le clic et affiche `toast.error(t('boats.index.quotaReached'))` au lieu de naviguer
3. **Redirect dans `GET /boats/new`** (`BoatsController.create`) — si accès direct par URL, redirige vers `/boats` + flash error
4. **Assert dans `POST /boats`** (`BoatsController.store`) — `quotaService.assertCanAddBoat()` avant toute création en base

**Changements :**

- `BoatsController.index` : charge l'org et passe `canAddBoat` (boolean) en prop Inertia via `quotaService.canAddBoat()`
- `BoatsController.create` : vérifie `canAddBoat` avant de rendre le formulaire
- `inertia/pages/boats/index.vue` : `handleNewBoat()` remplace le lien direct ; bouton avec `LockClosedIcon` conditionnel
- i18n : `boats.index.quotaReached` ajouté en EN et FR

**Correctif** : import ESM dans `app/services/boat_hull_service.ts` — import relatif `../utils/boat_utils` (sans `.js`) remplacé par l'alias `#utils/boat_utils` (résolution correcte en ESM Node 20)

---

## 2026-05-22 — Système de quotas par plan (Starter / Pro / Enterprise)

Mise en place de l'enforcement des limites par plan organisationnel. Le plan est assigné manuellement en BDD (pas de Stripe).

**Architecture :**

- **`shared/types/plan.ts`** — source de vérité unique partagée backend/frontend :
  - `PlanTier` : `'starter' | 'pro' | 'enterprise'`
  - `PLAN_LIMITS: Record<PlanTier, PlanQuotas>` — limites par plan
  - `getUpgradeTier(current)` — retourne le tier suivant ou `null`
  - `QuotaUsage` — interface pour la page billing
- **`app/exceptions/quota_errors.ts`** : `QuotaExceededError(feature, limit, current, upgradeTo)`
- **`app/services/quota_service.ts`** :
  - `canAddBoat(org)` → `Promise<boolean>` — pour l'UI (pas de throw)
  - `assertCanAddBoat(org)` → throw si dépassé
  - `assertCanAddMember(org)` → throw si dépassé
  - `assertCanUseAI(org)` → synchrone, throw si non autorisé
  - `assertCanExport(org)` → synchrone, throw si non autorisé

**Guards backend (controllers) :**

- `BoatsController.store` : `assertCanAddBoat` avant `request.validateUsing`
- `BoatsController.create` : `canAddBoat` pour bloquer l'accès au formulaire
- `OrganizationInvitationsController.store` : `assertCanAddMember` avant création
- `AiController.chat`, `fleetAnalysis`, `boatSuggestions` : `assertCanUseAI` en entrée de chaque méthode

**Autres :**

- **Migration** : colonne `plan` (enum `starter|pro|enterprise`, défaut `starter`) sur `organizations`
- **Inertia shared props** : `currentPlan` exposé à toutes les pages via `InertiaMiddleware`
- **Page billing** (`settings/billing`) : plan réel, jauges usage (bateaux/membres), disponibilité IA/export, CTA mise à niveau
- **i18n** : `flash.quota.{boatsExceeded,membersExceeded,aiExceeded,exportExceeded}` en EN et FR ; refonte `settings.billing.*`

**Limites par plan :**

| Feature       | Starter | Pro | Enterprise |
| ------------- | ------- | --- | ---------- |
| Bateaux max   | 2       | 25  | ∞          |
| Membres max   | 1       | 5   | ∞          |
| IA / Copilote | ✗       | ✓   | ✓          |
| Export        | ✗       | ✓   | ✓          |

> Pour tout futur controller d'export : appeler `quotaService.assertCanExport(org)` en entrée.

---

## 2026-05-22 — Invitations de membres

Feature d'invitation de membres par email :

- Envoi d'une invitation par email avec token signe (expiry 7 jours)
- Page d'acceptation `/invitations/accept?token=xxx` (publique, auth requise pour accepter)
- Annulation d'invitation depuis les settings
- Routes : POST/DELETE /organization/invitations, GET/POST /invitations/accept
- Liste des invitations pending dans settings/members
- Table `organization_invitations` avec statuts pending/accepted/cancelled

---

## 2026-05-22 — Système de permissions Bouncer (rôles admin / member, scoped organisation)

- Nouvelle table `organization_memberships` (`user_id`, `organization_id`, `role` enum admin|member) avec contrainte d'unicité par paire user-org
- Migration de backfill : tous les utilisateurs existants liés à une org deviennent `admin`
- Modèle `OrganizationMembership` + helpers `User.getRoleInOrg(orgId)` / `User.isAdminOf(orgId)`
- 4 policies Bouncer dans `app/policies/` : `BoatPolicy`, `PortPolicy`, `MaintenancePolicy`, `OrganizationPolicy`
  - Matrice : admin → tout autoriser via hook `before` ; member → view/create/edit bateaux et maintenance, lecture seule infrastructure
  - Suppression de bateaux, ports/pontoons/mouillages/spots, maintenance : admin uniquement
- Remplacement de toutes les anciennes abilities `boatView/boatCreate/boatUpdate/boatDelete` par les nouvelles policies dans tous les controllers
- Service `OrganizationMemberService` : listMembers, addMember, updateRole, removeMember (avec protection dernier admin)
- Nouveau controller `OrganizationMembersController` + routes `GET/POST/PUT/DELETE /organization/members`
- Validator `inviteMemberValidator` / `updateMemberRoleValidator`
- Page frontend `inertia/pages/organization/members.vue` : table des membres, changement de rôle inline, formulaire d'invitation (visible admin seulement)
- Clés i18n `resources/lang/{en,fr}/organization.json`
- Types partagés dans `shared/types/organization.ts` : `OrgRole`, `OrganizationMemberData`

---

## 2026-05-21 — Refactorisation i18n : découpage de `app.json` en fichiers de domaine

- Suppression de `resources/lang/{en,fr}/app.json` (1 080+ lignes)
- Création de 13 fichiers de domaine par locale : `common.json`, `nav.json`, `auth.json`, `dashboard.json`, `planning.json`, `maintenance.json`, `settings.json`, `errors.json`, `equipment.json`, `boats.json`, `homePreview.json`, `public.json`, `ports.json`
- `app/middleware/inertia_middleware.ts` : filtre désormais par exclusion des namespaces backend-only (`flash`, `marketing`, `validator`) au lieu d'un filtre `app.*`
- API frontend `useT().t('clé')` inchangée — toutes les clés existantes fonctionnent sans modification

---

## 2026-05-21 — Sécurité : corrections SEC-M1 à SEC-M5

**SEC-M1 — Rate limiting** (`@adonisjs/limiter` v3, store database) :

- `POST /login`, `POST /forgot-password`, `POST /reset-password` → 10 req/min par IP (`authThrottle`)
- `POST /ai/chat`, `POST /ai/fleet-analysis`, `POST /ai/boats/:id/suggestions` → 20 req/min par userId/IP (`aiThrottle`)
- Migration : `1779300016000_create_rate_limits_table.ts`

**SEC-M2 — AI Chat** (`app/controllers/ai_controller.ts`, `app/validators/ai.ts`) :

- Validation VineJS : tableau `messages` avec `role: enum(['user','assistant'])` et `content: string.maxLength(4000)`, 1–50 éléments
- Réponse convertie en `session.flash('info')` + `response.redirect().back()` (suppression des `response.badRequest` / `response.accepted` JSON)

**SEC-M3 — cloudinaryPublicId** :

- Supprimé des props Inertia : `app/transformers/boat_transformer.ts`, `app/transformers/media_transformer.ts`, `app/controllers/boat_equipment_controller.ts`, `inertia/types/boat_show.ts`
- Le champ reste accessible côté serveur (Cloudinary download) mais n'est plus sérialisé vers le client

**SEC-M5 — Token de reset** (`app/services/password_reset_service.ts`) :

- Stockage en SHA-256 hex (plus de plain text en base)
- Comparaison avec `crypto.timingSafeEqual` pour éliminer les timing attacks
- Migration : `1779300015000_truncate_password_reset_tokens.ts` (purge des tokens plain-text existants)

---

## 2026-05-21 — Sécurité : activation CSP (Content-Security-Policy)

`config/shield.ts` : CSP activée en mode `reportOnly: true`.  
Directives : `default-src 'self'`, `img-src` autorise `res.cloudinary.com`, nonce Shield pour scripts et styles Vite/Inertia.  
Template `inertia_layout.edge` : nonce ajouté sur le `<script type="application/ld+json">` inline.  
**Prochaine étape** : surveiller les violations en prod, puis passer `reportOnly: false`.

## 2026-05-20 — Plan marina : requêtes Inertia

Le plan marina (`MarinaMapTab`) utilise désormais `router.patch` (cycle Inertia) au lieu de `fetch` JSON manuel.

- **Frontend** : drag des pontons/mouillages et assignation bateau → place via `router.patch` avec `preserveScroll` ; assignation avec partial reload `only: ['port']`
- **Backend** : `PontoonsController.updatePosition`, `MouillagesController.updatePosition`, `BoatsController.assign` renvoient `response.redirect().back()` (CSRF et validation VineJS inchangés)

## 2026-05-20 — Widget Marina sur le Dashboard

Ajout d'un widget "Marinas" sur la page d'accueil du tableau de bord.

- **`DashboardService`** : fetch des ports via `PortService.listForUser()`, nouveau type `DashboardPortItem` et `DashboardPortStats`
- **`PortService.listForUser()`** : ajout du comptage des spots totaux (via pontoons et mouillages) — calcul de `totalSpots` et `freeSpots`
- **`PortListItem`** (type frontend) : nouveaux champs `totalSpots` et `freeSpots`
- **`MarinaDashboardCard.vue`** : composant affichant la liste des ports avec taux de remplissage (barre de progression), nombre de places libres/total, et stats globales
- **i18n** : clés `dashboard.marina.*` ajoutées en FR et EN

## 2026-05-20 — Modele Spot (places de marina)

Introduction du modele `Spot` qui represente une place individuelle au sein d'un ponton ou mouillage. Un bateau est maintenant assigne a un spot (et non plus directement a un ponton/mouillage).

**Migrations** :

- `1779300011000_create_spots_table` : table `spots` (id, name, description, pontoon_id, mouillage_id, organization_id, timestamps)
- `1779300012000_alter_boats_for_spots` : ajout `spot_id`, suppression `pontoon_id`, `mouillage_id`, `spot_identifier`
- `1779300013000_alter_boat_position_history_for_spots` : ajout `spot_id`, suppression `pontoon_id`, `mouillage_id`, `spot_identifier`

**Modele** : `app/models/spot.ts` — relations `belongsTo(Pontoon)`, `belongsTo(Mouillage)`, `belongsTo(Organization)`, `hasMany(Boat)`

**Validator** : `app/validators/spot.ts` — `createSpotValidator`, `updateSpotValidator`

**Service** : `app/services/spot_service.ts` — `createForPontoon`, `createForMouillage`, `update`, `delete`

**Controller** : `app/controllers/spots_controller.ts` — actions `storeForPontoon`, `storeForMouillage`, `update`, `destroy`

**Routes** (dans `start/routes/ports.ts`) :

- `POST /ports/:portId/pontoons/:pontoonId/spots` — creer un spot sur un ponton
- `POST /ports/:portId/mouillages/:mouillageId/spots` — creer un spot sur un mouillage
- `PUT /spots/:id` — modifier un spot
- `DELETE /spots/:id` — supprimer un spot

**Modeles modifies** :

- `Pontoon`, `Mouillage` : ajout relation `hasMany(Spot)`
- `Boat` : remplace `pontoonId`, `mouillageId`, `spotIdentifier` par `spotId` + `belongsTo(Spot)`
- `BoatPositionHistory` : remplace `pontoonId`, `mouillageId`, `spotIdentifier` par `spotId` + `belongsTo(Spot)`

**Services modifies** :

- `BoatService` : `updateAssignment` prend maintenant `{ spotId }` au lieu de `{ pontoonId, mouillageId, spotIdentifier }`
- `PortService` : `getWithPontoonsAndMouillagesOrFail` retourne les spots par ponton/mouillage avec le bateau assigne
- `PontoonService`, `MouillageService` : verification des bateaux via spots avant suppression

---

## 2026-05-20 — Plan interactif 2D de la marina

Ajout d'un onglet "Plan marina" sur la page de detail d'un port. Canvas SVG interactif avec positionnement libre des pontons et mouillages (coordonnees x/y persistees en base), mode edition pour repositionner les elements par drag, et reaffectation des bateaux par clic.

**Composants Vue crees** :

- `inertia/components/ports/show/tabs/PortListTab.vue` — onglet liste (extrait de show.vue)
- `inertia/components/ports/show/tabs/MarinaMapTab.vue` — orchestrateur du plan marina
- `inertia/components/ports/show/MarinaCanvas.vue` — canvas SVG 1400x900 avec drag
- `inertia/components/ports/show/MarinaPontoon.vue` — composant SVG ponton avec slots bateaux
- `inertia/components/ports/show/MarinaMouillage.vue` — composant SVG zone mouillage
- `inertia/components/ports/modals/BoatAssignModal.vue` — modale affectation bateau

**Page modifiee** : `inertia/pages/ports/show.vue` — ajout BaseTabs (list/plan)

**Routes backend utilisees** :

- `PATCH /ports/:portId/pontoons/:pontoonId/position` — met a jour la position x/y d'un ponton
- `PATCH /ports/:portId/mouillages/:mouillageId/position` — met a jour la position x/y d'un mouillage
- `PATCH /boats/:id/assignment` — reaffecte un bateau a un ponton/mouillage

**i18n** : cles `ports.tabs.*` et `ports.plan.*` ajoutees en FR et EN

---

## 2026-05-19

### Plan interactif 2D de marina — Backend

Couche backend pour la feature de plan interactif de marina permettant le positionnement drag-and-drop des pontons/mouillages et l'affectation rapide des bateaux.

**Migrations** :

- `1779300009000_alter_pontoons_add_position` : ajout `position_x`, `position_y` (double, nullable) sur `pontoons`
- `1779300010000_alter_mouillages_add_position` : idem sur `mouillages`

**Modèles** : `Pontoon` et `Mouillage` — colonnes `positionX`, `positionY` ajoutées

**Validator** : `app/validators/marina_layout.ts`

- `updatePositionValidator` : `{ x: number, y: number }`
- `assignBoatValidator` : `{ pontoonId?, mouillageId?, spotIdentifier? }`

**Services** :

- `PontoonService.updatePosition(pontoon, { x, y })` — sauvegarde position
- `MouillageService.updatePosition(mouillage, { x, y })` — idem
- `BoatService.updateAssignment(boat, { pontoonId, mouillageId, spotIdentifier })` — réaffecte un bateau et enregistre l'historique

**Routes** :

- `PATCH /ports/:portId/pontoons/:pontoonId/position` → `ports.pontoons.updatePosition`
- `PATCH /ports/:portId/mouillages/:mouillageId/position` → `ports.mouillages.updatePosition`
- `PATCH /boats/:id/assignment` → `boats.assign`

**PortService** : `getWithPontoonsAndMouillagesOrFail` expose maintenant `positionX`, `positionY` pour pontons et mouillages

---

### Ajout des mouillages aux ports

- Nouvelle entité `Mouillage` (table `mouillages`) : nom, description, appartient à un port (CASCADE on delete)
- CRUD complet sur la page détail d'un port : section "Mouillages" avec formulaire inline et cartes (`MouillageCard`, `MouillageFormModal`)
- Affectation d'un bateau à un mouillage (exclusif avec le ponton) : champ `mouillage_id` sur `boats`, formulaire bateau mis à jour avec deux selects mutuellement exclusifs (Ponton | Mouillage)
- Historique de position étendu : `mouillage_id` sur `boat_position_history`, `portName` résolu depuis le mouillage si pas de ponton
- Protection suppression : impossible de supprimer un mouillage ou un port si des bateaux y sont affectés
- Routes : `POST/PUT/DELETE /ports/:portId/mouillages[/:mouillageId]`
- i18n EN + FR complets (`ports.mouillages.*`, `boats.hullFields.mouillage`)

---

### Refonte pages Pricing, About, Contact — Frontend

Implémentation complète des trois pages marketing depuis un design prototype (Claude Design). Chaque page est décomposée en composants Vue 3 autonomes (`<script setup>`), avec props typées et i18n EN+FR.

**Pages et composants créés :**

- **`marketing/pricing.vue`** + 7 sections : `PricingHeroSection` (toggle billing mensuel/annuel), `PricingTiersSection` (3 plans avec prices billing-aware), `PricingROISection` (calculateur interactif), `PricingTestimonialsSection`, `PricingDetailedTableSection` (8 groupes accordéon), `PricingExtrasSection`, `PricingFaqSection`
- **`marketing/about.vue`** + 8 sections : `AboutHeroSection`, `AboutOriginSection`, `AboutValuesSection`, `AboutTeamSection`, `AboutNumbersSection`, `AboutTimelineSection`, `AboutOfficeSection`, `HomeFinalCtaSection`
- **`marketing/contact.vue`** + 5 sections : `ContactHeroSection`, `ContactChannelsSection`, `ContactFormSection`, `ContactOfficesSection`, `ContactFaqSection`

**Routes mises à jour** (`start/routes/marketing.ts`) :

- `buildPricingPageData(i18n)` → `/en/tarifs`, `/fr/tarifs`
- `buildAboutPageData(i18n)` → `/en/about`, `/fr/a-propos`
- `buildContactPageData(i18n)` → `/contact`

**i18n** : namespaces `pricing2`, `about2`, `contact2` ajoutés dans `fr/marketing.json` et `en/marketing.json`.

---

### Refonte complète de la landing page marketing — Frontend

Implémentation de la landing page FleetAi depuis un design prototype (Claude Design). La page `marketing/home.vue` a été entièrement redessinée avec les sections suivantes :

- **Hero persona-aware** : H1 Instrument Serif 84px, persona switcher (loueurs / écoles / marinas), mock dashboard dans un frame navigateur macOS
- **Logos band** : défilement marquee, 8 clients fictifs
- **Section Problème** : 3 cartes avec stats corail (73 %, 1 200 €, 4h/sem)
- **Section Piliers** : 3 piliers solution (Historique immuable, Planification intelligente, Fleetide IA)
- **3 Feature deep-dives** : layouts alternés gauche/droite avec mocks applicatifs (fiche bateau, planning calendrier, chat Fleetide)
- **Section Personas** : 4 onglets (loueurs / écoles / marinas / armateurs), quote + stat par persona
- **Bande de stats** : 4 métriques en grand Instrument Serif
- **Table comparatif** : fond navy, comparaison Excel / Papier / FleetAi
- **Mur de témoignages** : 1 featured + 3 petits
- **Sécurité & conformité** : 6 cartes (UE, RGPD, chiffrement, etc.)
- **FAQ accordéon** : 8 questions
- **CTA final** : fond navy gradient avec déco boussole SVG

Nouveaux composants créés : `HomeBrowserFrame`, `HomeMockDashboard`, `HomeMockBoatDetail`, `HomeMockPlanning`, `HomeMockFleetide`, `HomeProblemSection`, `HomePillarsSection`, `HomeFeatureSection`, `HomePersonasSection`, `HomeStatsBandSection`, `HomeComparisonSection`, `HomeTestimonialsSection`, `HomeSecuritySection`, `HomeFaqSection`, `HomeFinalCtaSection`.

Layout `public.vue` modifié : `<main>` désormais `w-full` (suppression du padding pour permettre les sections pleine-largeur).

Routes marketing.ts : ajout de la fonction `buildHomePageData()` avec toutes les clés i18n. Clés ajoutées dans `fr/marketing.json` et `en/marketing.json`.

### Gestion des ports, pontons et emplacements bateaux — Backend + Frontend

Nouveau système complet de localisation des bateaux dans les marinas.

**Migrations** (4 nouvelles) :

- `create_ports_table` : table `ports` (organization_id FK, name, city, country, address, notes)
- `create_pontoons_table` : table `pontoons` (port_id FK, name, description)
- `alter_boats_add_pontoon_fields` : ajout `pontoon_id` (FK nullable) et `spot_identifier` (varchar 16) sur `boats`
- `create_boat_position_history_table` : historique des positions (boat_id, pontoon_id, spot_identifier, started_at, ended_at)

**Modèles** : `Port`, `Pontoon`, `BoatPositionHistory` + relations ajoutées sur `Boat` (pontoon, positionHistory) et `Organization` (ports)

**Services** :

- `port_service.ts` : CRUD ports + garde `PortHasBoatsError` / `PontoonHasBoatsError`
- `pontoon_service.ts` : CRUD pontons avec vérification bateaux avant suppression
- `boat_service.ts` : ajout champs `pontoonId`/`spotIdentifier` + méthode `_logBerthChange` pour historique automatique à chaque changement d'emplacement

**Controllers** : `ports_controller`, `pontoons_controller` + mise à jour `boats_controller` (pontoon + historique dans show, ports dans edit/create)

**Routes** : `start/routes/ports.ts` — CRUD ports (`ports.*`) + CRUD pontons (`ports.pontoons.*`)

**Validators** : `port.ts`, `pontoon.ts` + ajout `pontoonId`/`spotIdentifier` dans `boat.ts`

---

### Gestion des ports et pontons — Frontend

Nouvelles pages et composants Vue 3 pour la gestion des ports et pontons :

**Pages ports** (`inertia/pages/ports/`) :

- `index.vue` : liste des ports avec cards (nom, ville, nb pontons, nb bateaux), empty state, bouton "Nouveau port"
- `new.vue` : formulaire de creation de port (name, city, country, address, notes)
- `show.vue` : detail d'un port avec liste des pontons, formulaire inline d'ajout/modification de ponton
- `edit.vue` : formulaire d'edition de port

**Composants ports** (`inertia/components/ports/`) :

- `show/PontoonCard.vue` : affiche un ponton avec sa liste de bateaux et liens vers les fiches bateau
- `modals/PontoonFormModal.vue` : formulaire inline de creation/modification de ponton

**Modifications bateaux** :

- `BoatFormHullFields.vue` : nouvelle section "Emplacement actuel" avec selects Port > Ponton cascades + champ N° d'emplacement
- `BoatShowTabSpecs.vue` : nouvelle carte "Emplacement actuel" affichant le port/ponton ou fallback sur homePort
- `BoatShowTabOverview.vue` : affichage de l'emplacement actuel (Port / Ponton / #spot) dans la sidebar

**Types** :

- `inertia/types/port.ts` : `PortListItem`, `PontoonRow`, `PortShowDetail`, `PortEditPayload`

**i18n** : toutes les cles sont deja presentes dans `resources/lang/{en,fr}/app.json` (namespace `ports.*`)

---

## 2026-05-19

### Refonte landing pages marketing — contenu enrichi et nouvelles sections

**Home page** — 3 nouvelles sections + sections existantes enrichies :

- `HomeScreenshotsSection` : section "See it before you try it" avec 4 onglets produit (dashboard, fiche bateau, checklist, IA)
- `HomeIndustriesSection` : accordéon 3 cibles (loueurs & charters, écoles de voile, armateurs privés) avec pain points / bénéfices / micro-quote
- `HomeCaseStudySection` : étude de cas Marina Bleue — Challenge → Solution → Résultats avec 3 métriques (-80% temps, 22 bateaux, 0 oublié)
- `HomeProofSections` : témoignages enrichis (6 au lieu de 3), ajout taille de flotte et ancienneté
- `HomeHowItWorksSection` : sous-texte pratique par étape + timeline J1/J7/J30

**Pricing page** — sections enrichies :

- "Idéal pour" par plan (3 bullet points ciblés)
- Micro-quote client par plan
- Trust signals enrichis (essai 14 jours, rejoint par 40+ flottes)
- FAQ élargie de 5 à 9 questions

**About page** — nouvelles sections :

- `AboutTimelineSection` : frise chronologique 2024 → aujourd'hui
- Section Mission sur fond navy (eyebrow, statement, body)
- Valeurs étendues de 3 à 5 (transparence radicale, conformité maritime)
- Section Presse : 3 citations (Voiles & Voiliers, Bateaux.com, YachtingWorld)

**i18n** : `resources/lang/{en,fr}/marketing.json` — toutes nouvelles clés EN + FR  
**Routes** : `start/routes/marketing.ts` — nouvelles sections exposées via Inertia (EN + FR)

---

## 2026-05-18

### Analyse IA (Mistral) — Dashboard et fiche bateau

- Panneau IA du dashboard : bouton "Analyser la flotte" desormais fonctionnel — genere des suggestions Mistral basees sur l'etat reel de la flotte (bateaux, maintenances urgentes, stats)
- Panneau IA de la fiche bateau (onglet Vue d'ensemble) : bouton "Actualiser" genere des suggestions specifiques au bateau (moteurs, voiles, securite, taches en retard)
- Les analyses sont cachees en base (`ai_analyses`) et servies sans re-appel Mistral au rechargement de page
- Nouveaux endpoints : `POST /ai/fleet-analysis`, `POST /ai/boats/:id/suggestions`

---

## 2026-05-18

### Analyse IA avec Mistral — Backend

Intégration complète des suggestions IA via Mistral pour l'analyse de flotte et de bateaux individuels :

- **Migration** : nouvelle table `ai_analyses` (id, user_id, boat_id, kind, response_text, created_at)
- **Model** : `AiAnalysis` avec relations `User` et `Boat`
- **Service** : `AiAnalysisService` avec méthodes :
  - `getLatestFleetAnalysis(userId)` : récupère la dernière analyse de flotte
  - `getLatestBoatSuggestions(userId, boatId)` : récupère les dernières suggestions pour un bateau
  - `generateFleetAnalysis(userId, input)` : génère des suggestions IA pour la flotte entière
  - `generateBoatSuggestions(userId, boatId, input)` : génère des suggestions IA pour un bateau spécifique
- **Types exportés** : `AiSuggestion`, `FleetAnalysisInput`, `BoatSuggestionsInput`
- **Routes** :
  - `POST /ai/fleet-analysis` → `ai.fleetAnalysis` (déclenche l'analyse de flotte)
  - `POST /ai/boats/:id/suggestions` → `ai.boatSuggestions` (déclenche les suggestions bateau)
- **Props Inertia** :
  - Dashboard : `aiFleetAnalysis` (tableau de suggestions ou null)
  - Page boat/show : `aiSuggestions` (tableau de suggestions ou null)
- **i18n** : clé `flash.ai.analysisError` ajoutée (EN/FR)
- **Appel synchrone** : pas de queue, résultat stocké en base et servi en cache

---

## 2026-05-18

### Fiches de maintenance — Frontend

Interface Vue 3 complète pour les fiches de maintenance :

- **Nouvel onglet** "Fiches" dans la page de détail du bateau (`?tab=sheets`)
- **Panel principal** (`BoatMaintenanceSheetsPanel`) : création de fiches via modal, filtrage par type
- **Carte de fiche** (`BoatMaintenanceSheetCard`) : affichage du titre, type (badge couleur), statut, progression, expand/collapse
- **Liste d'items** (`BoatMaintenanceSheetItemList`) : checkbox isDone, notes inline avec debounce
- **Actions** : créer, marquer complète, supprimer (avec confirmation)
- **Types** : `MaintenanceSheetRow` et `MaintenanceSheetItemRow` dans `boat_show.ts`
- **i18n** : clés `boats.sheets.*` ajoutées en FR et EN

---

## 2026-05-18

### Fiches de maintenance — Backend

Backend complet pour les fiches de maintenance avec checklist pré-remplie :

- **Types de fiches** : entretien (10 items), montage (10 items), hivernage (14 items), déshivernage (14 items), atelier (8 items)
- **Modèles** : `BoatMaintenanceSheet` et `BoatMaintenanceSheetItem` avec relations Lucid
- **Service** : `BoatMaintenanceSheetService` (list, create, complete, delete, updateItem)
- **Service de templates** : `BoatMaintenanceSheetTemplateService` retourne les items par défaut selon le type
- **Controllers** : `BoatMaintenanceSheetsController` (store, complete, destroy) et `BoatMaintenanceSheetItemsController` (update)
- **Validator** : `createBoatMaintenanceSheetValidator` et `updateSheetItemValidator`
- **Routes** :
  - `POST /boats/:boatId/maintenance-sheets` — créer une fiche
  - `PUT /boats/:boatId/maintenance-sheets/:sheetId/complete` — marquer complète
  - `DELETE /boats/:boatId/maintenance-sheets/:sheetId` — supprimer
  - `PUT /boats/:boatId/maintenance-sheets/:sheetId/items/:itemId` — mettre à jour un item
- **Données exposées** dans `BoatsController.show` via `maintenanceSheets`

---

## 2026-05-18

### Fiche bateau — champs réglementaires français

- **Port d'attache** (`home_port`) : champ texte libre sur le bateau
- **Catégorie de navigation CE** (`navigation_category`) : A / B / C / D avec descriptions (A = océanique, B = hauturière, C = côtière, D = eaux abritées)
- **Numéro de coque HIN/WIN** (`hull_identification_number`) : identifiant constructeur
- **Numéro de francisation** (`francisation_number`) : référence de l'acte douanier
- **Pavillon** (`flag_country`) : code pays (ex. `FR`)
- **Personnes max à bord** (`max_persons`) : nombre entier

### Armement de sécurité

Nouvelle section dédiée sur la fiche bateau, avec CRUD complet :

- **Types** : gilet de sauvetage, radeau, extincteur, VHF, fusée/signal de détresse, EPIRB/PLB, trousse de premiers secours, harnais, bouée, ancre, pompe de cale, compas, AIS, GPS, radar, autre
- **Quantité** : nombre d'unités
- **Date d'expiration** : suivi du renouvellement obligatoire (gilets, fusées, radeaux…)
- **Statut** : OK (vert) · À vérifier (orange) · Périmé (rouge)
- **Notes** : remarques libres par équipement
- Filtrage dans l'onglet Équipement (`?tab=safety`)
- Routes : `POST/PUT/DELETE /boats/:boatId/safety-equipment[/:itemId]`

---

## 2026-05-18

### Pièces moteur

CRUD complet pour les pièces détachées associées à un moteur :

- Désignation, référence, stock, fournisseur, notes
- Accessible depuis la fiche moteur (`?tab=parts`)

### Catégories de maintenance étendues

Ajout des catégories : coque, électricité, plomberie, sécurité, pont, autre (en plus de moteur, voile, gréement)

---

## 2026-05-17

### Notes libres sur les équipements

Champ `notes` (texte libre) ajouté sur les moteurs, voiles et gréements.

### Liens contextuels dans l'historique de maintenance

Les sujets de maintenance sont désormais cliquables et renvoient vers l'équipement concerné.

---

## 2026-05-16

### Téléchargement de documents

- Téléchargement sécurisé des documents attachés aux bateaux et moteurs
- Compression automatique des PDFs via Ghostscript avant upload Cloudinary (`-dPDFSETTINGS=/ebook`)

### Documents moteur

Upload de documents (PDFs, images) directement depuis la fiche moteur.

### Réinitialisation de mot de passe

Flow complet : envoi d'email, lien sécurisé, saisie du nouveau mot de passe.

### Paramètres profil et organisation

Pages dédiées pour modifier les informations du profil utilisateur et de l'organisation.

---

## 2026-05-15

### Médias bateaux (photos et documents)

- Upload de photos et documents via Cloudinary
- Galerie photo sur la fiche bateau (onglet Documents)
- Chemins Cloudinary préfixés par environnement (isolation prod/staging)

### Système email

Intégration `@adonisjs/mail` avec transport SMTP — utilisé pour les emails transactionnels (reset password, notifications futures).

### Enrichissement fiche moteur

- **Heures à l'installation** (`install_hours`) : compteur de référence à la pose
- **Type de cycle** (`stroke_type`) : 2 temps / 4 temps

### Statut des équipements

Champ `status` sur les moteurs, voiles et gréements : `operational` · `in_maintenance` · `out_of_service` · `retired`, affiché avec badge coloré dans l'UI.

### Événements de maintenance depuis la fiche moteur

Ajout d'un événement de maintenance directement depuis la page moteur, sans repasser par la fiche bateau.

### Transitions UI

Animations de transition sur les onglets (indicateur glissant), modals et pages.

---

## 2026-05-13

### Synchronisation onglet / URL

Le paramètre `?tab=xxx` dans l'URL est synchronisé avec l'onglet actif — lien direct et navigation navigateur opérationnels.

---

## 2026-05-11

### Interface bateau à onglets

Fiche bateau réorganisée en 6 onglets : Vue d'ensemble · Specs · Équipements · Historique · Tâches · Documents.

### Modal d'ajout d'événement de maintenance

Formulaire modal pour enregistrer un événement depuis la fiche bateau ou moteur.

### Internationalisation complète

Toutes les chaînes UI sont passées par le système `t()` (useT composable) — support FR/EN sur la totalité des pages et composants.

### Sélecteur de langue

Composant de changement de langue (FR/EN), persistance dans un cookie.

### Pages marketing

Pages À propos et Contact avec animations, SEO meta et contenu localisé.

### PWA

Manifest web app progressif + favicon/branding Fleetide.

---

## 2026-04-27 — 2026-05-10

### Internationalisation backend

Clés de traduction AdonisJS pour les messages flash, erreurs de validation et emails.

### Refactoring composables

- `useT` : composable i18n universel côté Vue
- `useBoatOptions` : options de select centralisées (propulsion, matériau, etc.)

---

## 2026-04-21

### Tâches de maintenance planifiées

Séparation tâches ouvertes / historique terminé. Récurrence par mois ou par heures moteur, échéances en heures moteur.

### Intégration Mistral AI

Service `ai_service.ts` + job de queue pour les analyses IA des maintenances. Interface de prompt sur le tableau de bord.

### Système de queue (PostgreSQL)

Jobs asynchrones persistés en base (`queue_jobs`), avec déduplication idempotente (`queue_dedup_keys`).

### Tableau de bord

Page d'accueil authentifiée : maintenances urgentes, tâches en retard, prochaines échéances.

### Seeder de démo

Données de démonstration (bateau + moteur + voiles + gréement + historique de maintenance) pour initialisation rapide.

---

## 2026-04-20 — Initialisation du projet

### Socle technique

- AdonisJS v7 (TypeScript strict) + Vue 3 / Inertia.js SSR
- PostgreSQL + Lucid ORM, migrations, seeders
- Auth @adonisjs/auth + Bouncer (ACL par abilities)
- Docker + CI/CD GitHub Actions
- ESLint (max-lines 250, vue rules) + Prettier
- Vitest + @vue/test-utils (tests frontend) / Japa (tests backend)
- Tailwind CSS v4
- Design system : composants base (BaseButton, BaseCard, BaseInput, BaseSelect, BaseBadge…)

### Gestion des bateaux

- CRUD bateaux (coque, moteurs, voiles, gréement)
- Historique d'entretien avec pièces consommées
- Architecture REST : hull vs équipements séparés
