# Points de log GPS en cours de sortie

**Date** : 2026-08-29

Le journal de bord gagne les **points de log en cours de route**, inspirés du cahier des
charges « livre de bord numérique » : en plus de la sortie (départ/arrivée), le marin
peut désormais consigner d'un tap des relevés horodatés — position, cap et vitesse
calculés automatiquement — complétés à la main par la configuration de voiles et un
commentaire. Une page de détail de la sortie affiche la liste chronologique des points
et le tracé sur une carte.

## Rafale GPS au tap (COG/SOG automatiques)

- Au tap sur « Ajouter un point », une **rafale de fixes GPS de 3-5 s** est capturée via
  `watchPosition`, démarré et arrêté **dans la même interaction** — jamais en arrière-plan,
  donc compatible iOS/PWA (le JS s'arrête dès que l'app quitte le premier plan).
- Un fix isolé donnerait un cap faux juste après un virement de bord : le **COG** (cap sur
  le fond) et la **SOG** (vitesse) sont calculés du premier au dernier fix de la rafale
  (`shared/helpers/geo.ts` : haversine + relèvement initial, conversion m/s → nœuds).
- **Seuil de bruit** : si la distance parcourue pendant la rafale est < 8 m (au mouillage,
  dérive GPS), le point est enregistré en « vitesse quasi nulle » (SOG 0, COG null).
- Les fixes de précision > 50 m sont ignorés ; géolocalisation refusée ou indisponible :
  le point reste enregistrable **sans coordonnées**.
- Composable : `inertia/composables/use_gps_burst.ts` (états `idle/acquiring/done/error`).

## Routes

- `GET /boats/:boatId/navigation-logs/:logId` — page de détail de la sortie
  (`boats.navigationLogs.show`) : en-tête, carte Leaflet/OSM avec marqueurs + polyligne
  chronologique, liste des points.
- `POST /boats/:boatId/navigation-logs/:logId/entries` — création d'un point
  (`boats.navigationLogs.entries.store`).
- `PATCH /boats/:boatId/navigation-logs/:logId/entries/:entryId` — édition
  (`boats.navigationLogs.entries.update`).
- `DELETE /boats/:boatId/navigation-logs/:logId/entries/:entryId` — suppression
  (`boats.navigationLogs.entries.destroy`).

## Table `navigation_log_entries`

`navigation_log_id` (FK cascade), `organization_id` (FK cascade), `recorded_at`,
`latitude`/`longitude`/`gps_accuracy_m` (nullable — point manuel possible), `cog_deg`
(0-359, null si vitesse quasi nulle), `sog_kn`, `sail_config`, `note`, timestamps.
Index composite `(navigation_log_id, recorded_at)`.

**Colonnes réservées à l'itération météo** (cache GRIB NOAA offline, non implémentée) :
`twd_deg`, `twa_deg`, `weather_snapshot` (jsonb) — nullable, jamais écrites aujourd'hui,
pour éviter un `ALTER TABLE` sur une table qui grossit vite.

## Comportements notables

- Un point ne peut viser que les sorties **du bateau de l'URL** (scoping IDOR identique
  aux sorties) et n'est éditable que sur une **sortie en cours** ; un profil disposant de
  `navigation_logs.delete` (admin) peut corriger une sortie clôturée — cas réel : rectifier
  le dernier point avec la position du port après un oubli de clôture. Aucune nouvelle
  capability : `navigation_logs.update` pour écrire, `navigation_logs.delete` pour corriger.
- **Offline** : la création et l'édition d'un point passent par la file hors-ligne existante
  (`use_offline_queue`, types `create-navigation-log-entry` / `update-navigation-log-entry`) ;
  l'horodatage naïf + `tzOffsetMinutes` (#452) garantit qu'un point saisi à 14 h et
  synchronisé à 18 h garde son instant réel.
- **Pas de verrouillage optimiste** (`expectedUpdatedAt`) sur les points en v1 : objets
  petits, créés en append, édition rare — contrairement aux sorties (#180).
- Les sorties exposent `entriesCount` (onglet fiche bateau, carte « En navigation », page
  flotte `/navigation/logbook`) avec lien vers la page de détail.
- i18n : bloc `navigation_logs.entries.*` (en/fr), flashes `flash.navigationLogEntry.*`.
  Lexique : « point de log » (EN « log point ») — ajouté à `docs/frontend/i18n.md`.

## Hors périmètre (itérations suivantes)

- Météo GRIB NOAA (grille en cache au départ, lookup offline en mer), TWD/TWA.
- Lien public de consultation (`view_id`), relances email, alerte admin d'inactivité.
