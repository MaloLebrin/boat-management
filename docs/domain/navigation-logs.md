# Domaine — Journal de bord (navigation logs)

## Objectif fonctionnel

Tenir le journal de bord de chaque bateau, sur le modèle d'un livre de bord papier mais
rempli en grande partie automatiquement :

- Enregistrer les **sorties** (trips) : départ/arrivée, ports, distance, heures moteur,
  carburant, conditions (Beaufort, état de mer), équipage à bord avec rôles
- Consigner des **points de log** en cours de route, d'un tap : position GPS, cap (COG) et
  vitesse (SOG) calculés automatiquement par rafale GPS, voiles et commentaire à la main
- Consulter le détail d'une sortie : liste chronologique des points + tracé sur carte
- Clôturer manuellement la sortie (jamais de clôture automatique par timeout — une sortie
  peut durer plusieurs jours) en propageant les heures moteur sur `boat_engines`
- Fonctionner **hors-ligne** (usage en mer) via la file PWA existante

Lexique (#368, `docs/frontend/i18n.md`) : une **sortie** (EN _trip_), un **point de log**
(EN _log point_). Éviter : trajet, passage, waypoint, entrée.

## Modèle de données

Références : `app/models/navigation_log.ts`, `app/models/navigation_log_entry.ts`,
migrations `1798000000000`, `1799000002000`, `1807000000000`, `1835000000000`.

### `navigation_logs` (la sortie)

| Colonne                                     | Type               | Contrainte                    |
| ------------------------------------------- | ------------------ | ----------------------------- |
| `id`                                        | integer PK         | —                             |
| `boat_id`                                   | FK → boats         | CASCADE                       |
| `organization_id`                           | FK → organizations | CASCADE                       |
| `status`                                    | enum               | `in_progress` \| `completed`  |
| `departed_at`                               | datetime           | NOT NULL, indexé              |
| `arrived_at`                                | datetime           | nullable                      |
| `departure_port_id` / `arrival_port_id`     | FK → ports         | nullable, SET NULL            |
| `departure_port_name` / `arrival_port_name` | string             | nullable (nom libre)          |
| `distance_nm`                               | decimal(10,2)      | nullable                      |
| `engine_hours_start` / `engine_hours_end`   | decimal(10,1)      | nullable                      |
| `fuel_consumed_liters`                      | decimal(10,3)      | nullable                      |
| `wind_force_beaufort`                       | integer            | nullable (0–12)               |
| `sea_state`                                 | enum               | `calm`…`very_rough`, nullable |
| `crew_count`, `notes`                       | integer / text     | nullable                      |

**Index partiel `one_in_progress_per_boat`** (#182) : `UNIQUE (boat_id) WHERE status =
'in_progress'` — une seule sortie en cours par bateau, garanti côté base (race-safe), avec
un check applicatif en amont pour l'erreur lisible (`NavigationLogInProgressError`).

### `navigation_log_crew` (pivot équipage, #101/#157)

`navigation_log_id` + `crew_member_id` (CASCADE), `role` enum `skipper` \| `crew` \|
`passenger`, unicité du couple. Voir `docs/domain/crew.md` (rôle d'équipage PDF).

### `navigation_log_entries` (le point de log)

| Colonne                                    | Type                         | Contrainte                                                                                            |
| ------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                                       | integer PK                   | —                                                                                                     |
| `navigation_log_id`                        | FK → navigation_logs         | CASCADE                                                                                               |
| `organization_id`                          | FK → organizations           | CASCADE                                                                                               |
| `recorded_at`                              | datetime                     | NOT NULL, index composite `(navigation_log_id, recorded_at)`                                          |
| `latitude` / `longitude`                   | decimal(9,6) / decimal(10,6) | nullable — point manuel sans GPS possible, mais toujours fournis **ensemble** (`coordinatesUnpaired`) |
| `gps_accuracy_m`                           | decimal(7,1)                 | nullable                                                                                              |
| `cog_deg`                                  | integer                      | nullable, 0–359 — null quand la vitesse est quasi nulle                                               |
| `sog_kn`                                   | decimal(5,2)                 | nullable                                                                                              |
| `sail_config`                              | string(255)                  | nullable (texte libre : « GV 1 ris + solent »)                                                        |
| `note`                                     | text                         | nullable (max 2000)                                                                                   |
| `twd_deg` / `twa_deg` / `weather_snapshot` | integer / integer / jsonb    | **réservés météo** — nullable, jamais écrits aujourd'hui (itération GRIB NOAA offline à venir)        |

Convention Lucid du repo : les décimaux sont typés `string` sur les modèles et convertis en
`number` par le transformer (`toNavigationLogRows`, `toNavigationLogEntryRows` dans
`app/transformers/boat_transformer.ts`).

## Rafale GPS au tap (COG/SOG automatiques)

Références : `inertia/composables/use_gps_burst.ts`, `shared/helpers/geo.ts`.

- Au tap « Ajouter un point », `watchPosition` est démarré **dans le handler du geste** et
  arrêté 3-5 s plus tard (ou après 6 fixes) — jamais en arrière-plan, donc compatible
  iOS/PWA (le JS s'arrête dès que l'app quitte le premier plan ; c'est la contrainte qui a
  écarté tout tracking continu).
- Un fix isolé donnerait un cap faux juste après un virement : le **COG** est le relèvement
  initial du premier vers le dernier fix de la rafale, la **SOG** = distance haversine /
  durée, convertie en nœuds.
- **Seuil de bruit** : distance de rafale < 8 m (mouillage, dérive GPS) → « vitesse quasi
  nulle » (`sogKn: 0`, `cogDeg: null`), position du fix le plus précis.
- Fixes de précision > 50 m ignorés ; géoloc refusée/indisponible → le point reste
  enregistrable sans coordonnées (états `idle | acquiring | done | error` exposés à l'UI).
- Les helpers vivent dans `shared/helpers/geo.ts` (et non `inertia/utils/`) : l'itération
  météo réutilisera côté backend le même code (TWA = TWD − COG, distance auto de sortie).

## Règles métier (services)

Références : `app/services/navigation_log_service.ts`,
`app/services/navigation_log_entry_service.ts`, erreurs dans
`app/exceptions/navigation_log_errors.ts`.

- **Sorties** : une seule `in_progress` par bateau ; `arrivedAt > departedAt`
  (`arrivedAtBeforeDeparture`) ; `engineHoursEnd >= engineHoursStart`
  (`engineHoursEndBeforeStart`) ; à la clôture, propagation des heures moteur sur le moteur
  ciblé (`boatEngineId`) ou sur l'unique moteur actif du bateau — jamais de devinette en
  multi-moteurs (#181) ; update partiel `undefined` = préservé / `null` = vidé (#180) ;
  verrouillage optimiste `expectedUpdatedAt` → `NavigationLogConflictError` + modal de
  résolution.
- **Points** : un point ne peut viser que les sorties **du bateau de l'URL** (scoping IDOR,
  même modèle que #157) ; éditables uniquement sur une sortie `in_progress`, sauf
  `allowCompleted` (correction admin) ; lat/lng fournis ensemble ou pas du tout ; **pas de
  verrouillage optimiste** en v1 (objets petits, créés en append, édition rare — décision
  du changelog 2026-08-29).
- **Horodatage** : datetime naïf + `tzOffsetMinutes` du navigateur, converti via
  `toUtcFromLocalInput` (#452) — un point saisi hors-ligne à 14 h et synchronisé à 18 h
  garde son instant réel.

## Permissions

Références : `app/policies/navigation_log_policy.ts`, `shared/types/permissions.ts`.

| Action                                                               | Capability               | Rôles           |
| -------------------------------------------------------------------- | ------------------------ | --------------- |
| Créer une sortie                                                     | `navigation_logs.create` | admin, member   |
| Mettre à jour / clôturer / points (CRUD)                             | `navigation_logs.update` | admin, member   |
| Supprimer une sortie · corriger les points d'une sortie **clôturée** | `navigation_logs.delete` | admin seulement |

Aucune capability dédiée aux points : ils suivent `navigation_logs.update`, et la
correction après clôture (cas réel : rectifier le dernier point avec la position du port
après un oubli de clôture) est adossée à `navigation_logs.delete`. `mechanic` et
`boat_owner` n'ont aucune capability `navigation_logs.*`.

## Routes

Références : `start/routes/boats.ts`, `start/routes/navigation.ts`.

| Méthode | URL                                                      | Nom                                      |
| ------- | -------------------------------------------------------- | ---------------------------------------- |
| GET     | `/navigation/logbook`                                    | `navigation.logbook` (vue flotte)        |
| GET     | `/boats/:boatId/navigation-logs/:logId`                  | `boats.navigationLogs.show` (détail)     |
| POST    | `/boats/:boatId/navigation-logs`                         | `boats.navigationLogs.store`             |
| PATCH   | `/boats/:boatId/navigation-logs/:logId`                  | `boats.navigationLogs.update`            |
| PATCH   | `/boats/:boatId/navigation-logs/:logId/close`            | `boats.navigationLogs.close`             |
| DELETE  | `/boats/:boatId/navigation-logs/:logId`                  | `boats.navigationLogs.destroy`           |
| PATCH   | `/boats/:boatId/navigation-logs/:logId/crew`             | `boats.navigationLogs.crew.sync`         |
| GET     | `/boats/:boatId/navigation-logs/:logId/crew-role.pdf`    | `boats.navigationLogs.crewRole.download` |
| POST    | `/boats/:boatId/navigation-logs/:logId/entries`          | `boats.navigationLogs.entries.store`     |
| PATCH   | `/boats/:boatId/navigation-logs/:logId/entries/:entryId` | `boats.navigationLogs.entries.update`    |
| DELETE  | `/boats/:boatId/navigation-logs/:logId/entries/:entryId` | `boats.navigationLogs.entries.destroy`   |
| GET     | `/boats/:id/export/navigation-logs.csv`                  | export CSV des sorties (quota-gated)     |

`/boats/:id/navigation` est une redirection legacy vers `/boats/:id?tab=navigation-logs` (#365).
Toutes les mutations répondent par redirection Inertia + flash (`flash.navigationLog.*`,
`flash.navigationLogEntry.*`) — jamais de JSON.

## Frontend

- **Onglet fiche bateau** `inertia/components/boats/show/tabs/BoatShowTabNavigationLogs.vue`
  (données différées, groupe `navigation`) : liste des sorties, création, clôture,
  équipage ; lien « N points · détail » vers la page de détail.
- **Carte « En navigation »** `NavigationActiveCard.vue` (page bateau) : durée écoulée,
  mise à jour, avitaillement, clôture, bouton **« Ajouter un point »**
  (`NavigationLogEntryQuickAdd.vue` : rafale GPS → formulaire pré-rempli).
- **Page de détail** `inertia/pages/boats/navigation_log_show.vue` : en-tête sortie, carte
  Leaflet/OSM (`NavigationLogEntryMap.vue`, import dynamique, marqueurs + polyligne
  chronologique — même pattern que `BoatShowTabPosition.vue`), liste chronologique
  (`NavigationLogEntryList.vue`) avec édition inline (`NavigationLogEntryEditForm.vue`).
- **Vue flotte** `inertia/pages/navigation/logbook.vue` : stats, filtre bateau, repli
  cartes/table (#493), compteur de points par sortie.
- **Offline** : `useNetworkStatus()` + `useOfflineQueue().enqueue(...)` — types
  `create-navigation-log`, `update-navigation-log`, `close-navigation-log`,
  `create-navigation-log-entry`, `update-navigation-log-entry`.
- **i18n** : `resources/lang/{en,fr}/navigation_logs.json` (dont bloc `entries.*`),
  `navigation.json` (vue flotte), `flash.json` (backend).

## Tests

- Functional : `tests/functional/boats/navigation_logs.spec.ts`,
  `navigation_log_entries.spec.ts`, `navigation_log_crew.spec.ts`,
  `tests/functional/navigation/*`
- Integration : `tests/integration/services/navigation_log_service.spec.ts`,
  `navigation_log_entry_service.spec.ts`
- Unit : `tests/unit/transformers/boat_transformer.spec.ts`
- Vitest : `tests/inertia/navigation_log_*.spec.ts`, `geo_helpers.spec.ts`,
  `use_gps_burst.spec.ts`

## Itérations à venir (cahier des charges « livre de bord numérique »)

1. **Météo GRIB NOAA offline** : grille `gfs_0p25` + `gfswave` (~100×100 nm autour du
   départ) téléchargée à la création de la sortie, cache client, lookup au point/horaire le
   plus proche au moment du tap ; TWD/TWA (= TWD − COG, normalisé ±180°) — les colonnes
   `twd_deg`/`twa_deg`/`weather_snapshot` sont déjà en base.
2. **Lien public de consultation** (`view_id` aléatoire non devinable, lecture seule).
3. **Relances email** (2 max si aucun point) et alerte admin après inactivité prolongée
   d'une sortie encore active.
