# 2026-06-23 — Tracking GPS / AIS — position temps réel des bateaux (V1) #112

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
