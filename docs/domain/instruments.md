# Domaine — Instruments de bord via Signal K (#986, socle #988)

## Objectif fonctionnel

Acquérir sans saisie les données des instruments d'un bateau (moteur, position, énergie, réservoirs, environnement, alarmes) depuis un serveur **Signal K** à bord. La PWA lit le serveur sur le Wi-Fi du bord, sous-échantillonne, puis envoie des **lots** à FleetAi. Ce document décrit le **socle backend** (PR 1). La bibliothèque client (PR 2), l'onglet (PR 3), la synchronisation métier (PR 4), les graphiques (PR 5), les alertes (PR 6, #993) et le plugin qui pousse (PR 7) viennent ensuite. Décisions D1–D9 : `docs/architecture/instruments-epic-986.md`.

## Plan

`canConnectInstruments` : Starter non, Pro et Entreprise oui (capacité de tier pure, comme l'inventaire #892). Les routes passent par `requireModulePlan({ feature: 'instruments' })` : un Starter est renvoyé vers `/settings/billing` avec `flash.quota.instrumentsExceeded`.

## Routes (`start/routes/instruments.ts`, auth + plan)

| Méthode | Pattern                                         | Nom                                   | Policy (`InstrumentSourcePolicy`) |
| ------- | ----------------------------------------------- | ------------------------------------- | --------------------------------- |
| PUT     | `/boats/:boatId/instrument-source`              | `boats.instrumentSource.upsert`       | `manage` (`instruments.manage`)   |
| DELETE  | `/boats/:boatId/instrument-source`              | `boats.instrumentSource.destroy`      | `manage`                          |
| POST    | `/boats/:boatId/telemetry`                      | `boats.telemetry.store`               | `ingest` (`boats.edit`)           |
| POST    | `/boats/:boatId/instrument-source/ingest-token` | `boats.instrumentIngestToken.store`   | `manage` (#994)                   |
| DELETE  | `/boats/:boatId/instrument-source/ingest-token` | `boats.instrumentIngestToken.destroy` | `manage` (#994)                   |
| POST    | `/api/instruments/ingest`                       | `api.instruments.ingest`              | jeton Bearer de la source (#994)  |

`view` (`boats.view`) couvre la lecture. `instruments.manage` est une capacité **admin seulement** : un member lit les jauges et pousse la télémétrie, mais ne branche pas de serveur.

- **Source** : `baseUrl` est validée par `normalizeInstrumentBaseUrl` (`https?://hôte[:port]`, rien d'autre) et normalisée en origine. `token` absent conserve le jeton, `null` ou vide l'efface. Succès : flash `success` et retour.
- **Télémétrie** : succès **sans flash** (un lot toutes les cinq minutes ne doit pas toaster) et `redirect().back()`. Refus métier : `flash('error')` et retour. Le lot est accepté ou refusé **en entier**.

## Ingestion (`TelemetryIngestService.ingest(source, batch, { origin })`)

Entrée unique, agnostique du transport (D1) : le contrôleur Inertia de la PWA l'appelle avec `origin: 'pwa'`, le futur contrôleur `/api` du plugin avec `'plugin'`. Les effets métier sont des listeners de l'event `TelemetryIngested` (`app/events/`).

1. `prepare` : la source est celle du lot et est activée ; ≤ 500 échantillons (`TELEMETRY_MAX_BATCH_SIZE`) ; chemin dans la liste blanche ; `recordedAt` lisible et pas plus de 5 minutes dans le futur (D9) ; `value` fini et dans la plage de `numeric(14,4)` pour un chemin numérique, `valueJson` pour un chemin structuré.
2. Insertion par tranches de 100 : `INSERT … ON CONFLICT (source_id, path, recorded_at) DO NOTHING RETURNING id`. Le nombre de lignes rendues donne `accepted`, la différence `ignored` (D4).
3. `touchLastSeen` (date posée, `lastError` effacé), journal, puis event.

Erreurs (`app/exceptions/instrument_errors.ts`) : `InstrumentSourceNotFoundError`, `InstrumentSourceDisabledError`, `InvalidInstrumentBaseUrlError`, `TelemetryBatchTooLargeError`, `TelemetryPathNotAllowedError`, `TelemetryRecordedAtInvalidError`, `TelemetryValueOutOfRangeError`, `TelemetryValueKindMismatchError`.

### Contrat du lot (`TelemetryBatchPayload`, aussi celui du plugin — #994)

```json
{
  "sourceId": 12,
  "batchId": "6b0f6f6e-…",
  "samples": [
    { "path": "propulsion.port.revolutions", "recordedAt": "2026-10-19T09:55:00Z", "value": 41.67 },
    {
      "path": "navigation.position",
      "recordedAt": "2026-10-19T09:55:00Z",
      "valueJson": { "latitude": 43.29, "longitude": 5.37 }
    }
  ]
}
```

Valeurs en **SI** (D8) : `revolutions` en Hz, `runTime` en secondes, niveaux et charge en ratio, vitesses en m/s, températures en K, angles en rad, pressions en Pa. `recordedAt` est l'horloge du **client** (D9).

## Chemins acceptés

Liste blanche fermée `INSTRUMENT_PATH_CATALOG` (`shared/constants/instruments.ts`) : `propulsion.<id>.*`, `navigation.*`, `electrical.batteries.<id>.*`, `tanks.<type>.<id>.*`, `environment.*`, `notifications.<chemin>` (valeur structurée). `isAllowedTelemetryPath()` en est le prédicat, partagé avec le client.

## Fiche bateau et CSP

`BoatsController.show()` charge la source **dans la réponse initiale** (la CSP doit déjà être ouverte à l'arrivée de la page) quand le plan l'autorise, puis `applyInstrumentCsp` relit l'en-tête posé par Shield et ajoute `https://hôte:port wss://hôte:port` à `connect-src` (plus `http://` et `ws://` hors production). Sans en-tête (test) ou sans source activée, rien ne change. La valeur est sûre parce que `baseUrl` est une origine validée.

La prop différée `instruments` (groupe `instruments`, jamais `null`, #478) porte `{ source, latest, recent, can }` :

- `source` : la ligne et son jeton **en clair seulement pour qui peut ingérer** (`boats.edit`, D3), sinon `token: null` ; jamais dans le HTML initial ;
- `latest` : dernière valeur de chaque chemin (`DISTINCT ON (path)`) ;
- `recent` : points numériques des 60 dernières minutes par chemin ;
- `can` : `{ manage, ingest }`.

Sans le flag de plan, la prop résout `{ source: null, latest: [], recent: {}, can }`.

## File hors-ligne

L'action `INGEST_TELEMETRY_ACTION` (`ingest-telemetry`) est enfilée par `use_telemetry_sync` (PR 2, #989) en mode **silencieux** (`silent: true`, voir [`offline-queue.md`](offline-queue.md)). Le contrôleur d'ingestion pose `rejectedType = ingest-telemetry` avec le flash `error` sur tout refus métier : l'action part dans `failed` au lieu d'être supprimée comme un succès.

## Client (PR 2, #989) — `inertia/lib/signalk/` et composables

Bibliothèque pure, sans Vue : `WebSocket` et `fetch` sont injectés.

| Fichier                | Rôle                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.ts`             | `SignalKDelta`, `SignalKUpdate`, `SubscriptionSpec`, états `idle \| connecting \| open \| reconnecting \| closed \| error`, clés d'erreur `unreachable \| unauthorized \| tls \| protocol` |
| `client.ts`            | `createSignalKClient` : découverte `GET /signalk`, sonde `GET …/vessels/self`, `WebSocket(…/stream?subscribe=none&token=…)` puis abonnement, heartbeat 20 s, repli plafonné à 30 s         |
| `units.ts`             | SI → affichage : m/s→nœuds, K→°C, rad→°, ratio→%, Pa→bar, s→h, **Hz→tr/min**, `toDisplayUnit(unité du catalogue, valeur)`                                                                  |
| `path_catalog.ts`      | cadence par chemin (`intervalS`, `last \| mean \| max`) et abonnements générés depuis le catalogue partagé (jokers `propulsion.*.runTime`)                                                 |
| `sample_normalizer.ts` | delta → échantillons du catalogue ; écarte `null`, non-finis, chemins inconnus et autres navires ; réduit position et alarmes                                                              |
| `aggregator.ts`        | une valeur par chemin et par fenêtre, datée au début de la fenêtre (**horloge du client**, D9) ; hors-ligne fenêtres de 5 min ; `coarsen` fond les plus anciens lots en demi-heures        |
| `instrument_store.ts`  | fenêtre en cours + lots gardés, dans IndexedDB `fleetide-instruments` (survit à un rechargement)                                                                                           |

Points tirés des mesures du spike (#985) :

- un serveur `--securityenabled` sans compte répond 401 en REST mais **ouvre le WebSocket sans émettre de delta** : le client sonde le REST avant le flux et s'arrête sur `unauthorized` ;
- la découverte renvoie des URL `http://`/`ws://` : le client en garde le chemin mais reprend l'origine configurée (sinon contenu mixte en HTTPS) ;
- `policy: fixed` avec une période par chemin ramène le débit du serveur à celui conservé (12 deltas/s en `instant`) ; les alarmes restent `instant`.

Composables :

- `use_instrument_stream` : valeurs les plus récentes par chemin, état de connexion, `staleSince` (`staleAfterS`, 120 s par défaut), Screen Wake Lock, **coupure du flux page masquée** et reprise au retour. Aucun effet côté serveur.
- `use_telemetry_sync` : agrège puis envoie. **En ligne** : `router.post` avec `only: ['instruments']` (la redirection ne rend que la prop différée). **Hors-ligne ou échec transitoire** : `enqueue` silencieux, un lot par demi-heure hors-ligne. À 96 lots de télémétrie en attente, les nouveaux lots sont fondus et gardés en mémoire/IndexedDB plutôt qu'empilés. Un refus ou une erreur de validation n'est pas renvoyé : le même lot donnerait le même refus.

## Onglet « Instruments » (PR 3, #990)

Visible en Pro et Entreprise (`effectiveQuotas.canConnectInstruments`), groupe `navigation`, après Position. Il lit la prop différée `instruments` (groupe `instruments`, skeleton tant qu'elle manque) et s'organise ainsi :

- **Admin** (`instruments.manage`) : formulaire de la source (adresse, jeton en écriture seule, contexte, activation) et retrait confirmé.
- **Membre** (`boats.edit`) : reçoit le jeton, ouvre le flux et envoie les lots tant que l'écran est ouvert.
- **Lecteur** (sans `boats.edit`) : dernières valeurs connues seulement, sans flux ni jeton.
- **Hors flux** : les jauges restent alimentées par `latest` (« dernière valeur connue, date »), avec un badge « périmé » au-delà de deux minutes ; en direct, le flux remplace la valeur du serveur.

L'acquisition ne tourne que l'onglet ouvert : le flux est coupé quand la page passe en arrière-plan. « Préparer la traversée » pré-charge `?tab=instruments` quand le plan l'ouvre, ce qui permet de rouvrir l'onglet hors-ligne avec les dernières valeurs et le jeton en cache.

**Réserve — go/no-go iOS.** La matrice contenu mixte mesurée sur téléphone (document d'épopée, « Encore ouvert ») n'était pas consignée à l'ouverture de cette PR. L'onglet reste utile quel que soit le résultat (dernières valeurs, historique, configuration), mais le flux depuis un iPhone dépend de cette mesure : un serveur à certificat de confiance (nom DNS) est le seul chemin sans manipulation sur l'appareil.

## Synchronisation métier (PR 4, #991)

`TelemetryIngested` est écouté par `OnTelemetryIngested` (`app/listeners/`), enregistré dans `start/events.ts`. Un lot entièrement rejoué (`accepted === 0`) est ignoré ; une panne de synchro est journalisée et **jamais propagée** à l'ingestion (les échantillons sont déjà écrits). Le listener lit la **dernière valeur en base** de chaque chemin utile (`TelemetryReadService.latestForPaths`) : un lot reçu en retard ne peut pas ramener le bateau en arrière.

### Heures moteur (`EngineHoursSyncService`, D6)

`boat_engines.instrument_key` (unique par bateau, saisi dans le formulaire moteur — un segment `[A-Za-z0-9_-]`, 40 caractères max) désigne le `<id>` de `propulsion.<id>.runTime`. `instrument_run_time_s` est la **base** du dernier `runTime` synchronisé. Décision (`decideRunTimeSync`) :

| Situation                    | Effet                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| pas de base                  | pose la base, `hours` inchangé (le compteur absolu du calculateur n'est jamais copié dans `hours`) |
| `runTime` < base             | reset du calculateur : re-base, `hours` inchangé, warning journalisé                               |
| ≥ 1 h entière depuis la base | `hours += floor((runTime − base)/3600)`, base avancée de `n × 3600` (le reliquat attend)           |
| sinon                        | rien                                                                                               |

L'écriture passe par `BoatEngineService.incrementHoursFromInstruments` (monotone, sans utilisateur) dans une transaction avec verrou de ligne : deux lots simultanés ne comptent pas deux fois la même heure. Changer l'`instrument_key` d'un moteur efface sa base ; une clé déjà prise sur le bateau est refusée (`BoatEngineInstrumentKeyTakenError`, flash `flash.engine.instrumentKeyTaken`). `runTime` négatif ou non fini : ignoré.

### Position et journal (`PositionSyncService`)

Sur `navigation.position` (valeur `{ latitude, longitude }` validée : finie, |lat| ≤ 90, |lon| ≤ 180), avec SOG (m/s → nœuds) et COG (rad → °) les plus récents :

- `BoatPositionService.storeInstrumentPosition` : fix plus ancien que la ligne `kind='position'` ouverte → ignoré ; ligne ouverte, **rafraîchie il y a moins de 5 min** et **à moins de 100 m** (`haversineDistanceMeters`) → **mise à jour en place** ; sinon `closeOpenOfKind('position')` puis insertion `source: 'gps'` (`startedAt` = horloge du client). Réglages dans `shared/constants/instrument_sync.ts`.
- Sortie `in_progress` (et fix postérieur au départ) : un `navigation_log_entries` **toutes les 10 min** au plus, `source: 'instruments'`, avec cog/sog, `twd_deg` (`environment.wind.directionTrue`), `twa_deg` (`environment.wind.angleTrueWater`) et `weather_snapshot` (`depthM`, `waterTemperatureC`, `windSpeedKn` quand connus).

### Interface

- Formulaire moteur : champ « Identifiant instruments » (`instrumentKey`).
- Clôture de trajet : `NavigationLogCloseForm` préremplit `engineHoursEnd` avec les heures du moteur tenu par les instruments (moteur unique, ou celui choisi) ; un moteur à saisie manuelle n'écrase pas ce qui est tapé.
- Journal : badge « Instruments » sur les points automatiques.

## Historique et rétention (PR 5, #992)

- `TelemetryReadService.series(boat, paths, range, now?)` : moyenne par seau `date_bin` (origine fixe `2000-01-01 UTC`, les bornes ne glissent pas d'une requête à l'autre). Plages (`TELEMETRY_SERIES_RANGES`) : `1h` → seaux d'1 min, `24h` → 15 min, `7d` → 1 h. Seul `value` (numérique) est agrégé ; le seau en cours est inclus.
- Prop **optionnelle** `instrumentSeries` de `boats.show` (`inertia.optional`) : absente de la visite, servie par `router.reload({ only: ['instrumentSeries'], data: { range, paths } })`. `parseSeriesQuery` (`shared/helpers/instruments.ts`) ignore plage inconnue, chemins hors catalogue ou non numériques ; 6 chemins maximum. Sans le flag de plan ou sans demande valide : `{ range: '24h', series: {} }`, jamais `null`.
- Interface : `InstrumentHistoryPanel.vue` (sélecteur de plage, cases par mesure, une courbe par mesure — pas d'axe double) + `InstrumentLineChart.vue` (chart.js, couleurs lues dans les tokens par `useChartPalette`, suit le thème). Valeurs converties en unité d'affichage côté client.
- Rétention : `TelemetryRetentionService.purgeExpired()` appelé par le job `PurgeTelemetrySamples` (cron `15 1 * * *`). Durées par plan dans `TELEMETRY_SAMPLE_RETENTION_DAYS` (`shared/constants/data_retention.ts`) : starter 30 j (bateau rétrogradé), pro 90 j, entreprise 365 j — à revoir avec le coût de stockage réel.

## Alertes et anomalies (PR 6, #993)

- **Règles intégrées** (`BUILTIN_ALERT_RULES`, `shared/constants/instrument_alerts.ts`, toujours actives, seuils en SI) : état de charge batterie < 20 % (retour à 25 %), température liquide de refroidissement moteur > 95 °C (retour à 90 °C), profondeur sous quille < 1,5 m (retour à 2 m), niveau de réservoir carburant < 15 % (retour à 20 %), tension batterie < 11,8 V (retour à 12,1 V), pression d'huile moteur < 1 bar (retour à 1,3 bar), régime moteur > 3 500 tr/min (retour à 3 300), et toute alarme Signal K `notifications.*` à l'état `alarm` ou `emergency` (levée au retour à un autre état).
- **Règles de l'admin** (`boat_instrument_alert_rules`, droit `instruments.manage`) : un chemin numérique concret, un opérateur `lt`/`gt`, un seuil, une marge de retour (hystérésis) et une gravité `warning`/`critical`. Le formulaire saisit seuil et marge dans l'**unité d'affichage** du chemin (°C, %, nœuds…) ; `InstrumentAlertRuleService` les convertit en SI (`displayToSi`, `hysteresisToSi` — la marge est un écart, sans le décalage du kelvin). Unique `(boat_id, path, operator)`, 20 règles par bateau (`INSTRUMENT_ALERT_MAX_RULES_PER_BOAT`). Modifier ou désactiver une règle ferme ses alertes ouvertes ; la supprimer supprime ses alertes.
- **Évaluation** : fonction pure `evaluateAlerts` (`shared/helpers/instrument_alerts.ts`), appliquée à l'identique côté serveur et côté client. Une alerte est **ouverte** quand la valeur franchit le seuil, **maintenue** (dernière valeur rafraîchie) tant qu'elle n'est pas revenue au-delà de `seuil ± marge`, puis **levée** (`cleared_at`, la ligne reste en historique). Une seule alerte ouverte par `(bateau, règle, chemin)` — index unique partiel `WHERE cleared_at IS NULL` ; deux évaluations simultanées n'en ouvrent qu'une.
- **Serveur** : le listener `OnTelemetryIngested` appelle `InstrumentAlertService.evaluate(source, paths)` (après les heures moteur et la position, dans son propre `try/catch`). Il lit la dernière valeur de chaque chemin du lot, les règles actives et les alertes ouvertes, applique les transitions et notifie. Un lot rejoué (`accepted === 0`) n'évalue rien.
- **Client** (retour immédiat à bord, hors ligne) : `use_instrument_stream` accepte `alertRules` (règles intégrées + règles actives, `alertRuleSpecs`) et évalue chaque delta ; `localAlerts` contient les alertes détectées à bord. L'onglet les fusionne avec `openAlerts` du serveur (`mergeInstrumentAlerts`, le serveur fait foi) et marque les alertes locales « Détectée à bord ».
- **Notifications** : `instrument.alert_opened` (`warning` pour une règle `warning`, `error` pour `critical`) et `instrument.alert_cleared` (`success`), famille `fleet`, toute l'équipe (`staffOf`, sans le rôle propriétaire), `actionUrl` `/boats/:id?tab=instruments`. L'ouverture est **poussable** (`PUSHABLE_NOTIFICATION_TYPES`), la levée reste in-app. Les préférences de la famille « Flotte » s'appliquent.
- **Interface** : `InstrumentAlertsList.vue` (alertes ouvertes), `InstrumentAlertRulesEditor.vue` (admin, sous la liste), pastille du nombre d'alertes sur l'onglet Instruments (`instrumentAlertCount` de `useBoatShowTabs`), ligne « Instrument » dans « À traiter » du tableau de bord (`DashboardAttentionService.fetchInstrumentAlerts`, `counts.instrumentAlerts`, gravité `critical` → danger).
- **Routes** : `POST /boats/:boatId/instrument-alert-rules`, `PUT …/:ruleId`, `DELETE …/:ruleId` (redirections Inertia, plan Pro/Entreprise). Lecture : `rules` et `openAlerts` dans la prop différée `instruments`. Audit : `boat.instrument_alert_rule_update` / `_delete`.
- Limites connues : la fusion client ne lève pas une alerte du serveur que le flux voit revenir à la normale (le serveur la lève au prochain lot) ; la pastille de groupe « Navigation » affiche la première pastille disponible (incidents avant instruments).

## Plugin Signal K — `POST /api/instruments/ingest` (PR 7, #994)

Repli universel sans navigateur (D1) : un plugin installé sur le serveur Signal K du bord pousse lui-même les lots. Le plugin vit **hors de ce dépôt** ; ce qui suit est son contrat.

- **Jeton par bateau.** Un admin le génère depuis la carte « Plugin Signal K » de l'onglet (`POST /boats/:boatId/instrument-source/ingest-token`). Il est tiré au hasard (32 octets, préfixe `fai_ing_`), **affiché une seule fois** (flash `instrumentIngestToken`, partagé dans `page.props.flash`) ; la base ne garde que son **sha256** (`boat_instrument_sources.ingest_token_hash`, unique, `serializeAs: null`) et la date d'émission. Régénérer remplace — donc révoque — l'ancien ; `DELETE` le révoque. Une source sans jeton refuse tout appel plugin.
- **Requête.** `POST {APP_URL}/api/instruments/ingest`, `Authorization: Bearer fai_ing_…`, `Content-Type: application/json`, corps = `TelemetryBatchPayload` ci-dessus (≤ 500 échantillons, `recordedAt` ISO 8601, valeurs en SI, mêmes chemins du catalogue). **`sourceId` est facultatif** (le jeton désigne la source) ; s'il est fourni il doit être celui de la source (sinon 422 `source_mismatch`).
- **Réponses (toujours JSON, jamais de redirection).** `200 { accepted, ignored }` — un lot rejoué est un succès (`ignored`, D4) ; `401 { error: 'unauthorized' }` (jeton absent, inconnu, mal formé ou révoqué — même réponse, `WWW-Authenticate: Bearer`) ; `403 { error: 'plan_not_allowed' }` (organisation rétrogradée sous Pro) ; `404 source_not_found` ; `409 { error: 'source_disabled' }` ; `422` `validation_failed` (forme, > 500 échantillons), `path_not_allowed` (+ `path`), `recorded_at_invalid` (illisible ou futur au-delà de 5 min), `value_invalid`, `source_mismatch` ; `429 { error: 'rate_limited', retryAfter }` avec `Retry-After`. Un lot est accepté ou refusé **en entier**.
- **Pile.** `start/routes/api.ts` → limiteur par IP (120/min, borne la devinette de jeton) → `InstrumentIngestTokenMiddleware` (Bearer → hash → `ctx.instrumentSource`, plan vérifié par `QuotaService.canConnectInstruments`) → limiteur par source (30/min) → `InstrumentIngestController.store` → `TelemetryIngestService.ingest(source, batch, { origin: 'plugin' })`, donc les mêmes effets (`TelemetryIngested` : heures moteur, position, alertes). Middleware nommé `instrumentIngestToken` dans `start/kernel.ts`.
- **Hors session.** Aucune session ni CSRF : `/api/instruments/ingest` est dans `config/shield.ts` `exceptRoutes`, et `/api/**` répond toujours en JSON (`app/exceptions/handler.ts`). Le Service Worker exclut déjà `/api/`.
- Audit : `boat.instrument_ingest_token_issue` / `_revoke`. Aucune clé de chiffrement : un sha256 suffit pour un jeton à haute entropie, et la valeur en clair n'est jamais relisible.

## Fichiers

```
app/models/boat_instrument_source.ts, boat_telemetry_sample.ts
app/services/instrument_source_service.ts, telemetry_ingest_service.ts, telemetry_read_service.ts
app/controllers/instrument_sources_controller.ts, boat_telemetry_controller.ts
app/policies/instrument_source_policy.ts
app/transformers/instrument_transformer.ts
app/validators/instruments.ts
app/events/telemetry_ingested.ts, app/listeners/on_telemetry_ingested.ts
app/services/engine_hours_sync_service.ts, position_sync_service.ts, telemetry_retention_service.ts
app/jobs/purge_telemetry_samples.ts
app/exceptions/instrument_errors.ts
app/utils/csp_connect_src.ts
shared/types/instruments.ts, shared/constants/instruments.ts, shared/helpers/instruments.ts
inertia/lib/signalk/*, inertia/composables/use_instrument_stream.ts, use_telemetry_sync.ts
```
