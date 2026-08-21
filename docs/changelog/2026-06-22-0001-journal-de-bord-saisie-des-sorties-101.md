# 2026-06-22 — Journal de bord — saisie des sorties #101

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
