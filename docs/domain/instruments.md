# Domaine — Instruments de bord via Signal K (#986, socle #988)

## Objectif fonctionnel

Acquérir sans saisie les données des instruments d'un bateau (moteur, position, énergie, réservoirs, environnement, alarmes) depuis un serveur **Signal K** à bord. La PWA lit le serveur sur le Wi-Fi du bord, sous-échantillonne, puis envoie des **lots** à FleetAi. Ce document décrit le **socle backend** (PR 1). La bibliothèque client (PR 2), l'onglet (PR 3), la synchronisation métier (PR 4), les graphiques (PR 5), les alertes (PR 6) et le plugin qui pousse (PR 7) viennent ensuite. Décisions D1–D9 : `docs/architecture/instruments-epic-986.md`.

## Plan

`canConnectInstruments` : Starter non, Pro et Entreprise oui (capacité de tier pure, comme l'inventaire #892). Les routes passent par `requireModulePlan({ feature: 'instruments' })` : un Starter est renvoyé vers `/settings/billing` avec `flash.quota.instrumentsExceeded`.

## Routes (`start/routes/instruments.ts`, auth + plan)

| Méthode | Pattern                            | Nom                              | Policy (`InstrumentSourcePolicy`) |
| ------- | ---------------------------------- | -------------------------------- | --------------------------------- |
| PUT     | `/boats/:boatId/instrument-source` | `boats.instrumentSource.upsert`  | `manage` (`instruments.manage`)   |
| DELETE  | `/boats/:boatId/instrument-source` | `boats.instrumentSource.destroy` | `manage`                          |
| POST    | `/boats/:boatId/telemetry`         | `boats.telemetry.store`          | `ingest` (`boats.edit`)           |

`view` (`boats.view`) couvre la lecture. `instruments.manage` est une capacité **admin seulement** : un member lit les jauges et pousse la télémétrie, mais ne branche pas de serveur.

- **Source** : `baseUrl` est validée par `normalizeInstrumentBaseUrl` (`https?://hôte[:port]`, rien d'autre) et normalisée en origine. `token` absent conserve le jeton, `null` ou vide l'efface. Succès : flash `success` et retour.
- **Télémétrie** : succès **sans flash** (un lot toutes les cinq minutes ne doit pas toaster) et `redirect().back()`. Refus métier : `flash('error')` et retour. Le lot est accepté ou refusé **en entier**.

## Ingestion (`TelemetryIngestService.ingest(source, batch, { origin })`)

Entrée unique, agnostique du transport (D1) : le contrôleur Inertia de la PWA l'appelle avec `origin: 'pwa'`, le futur contrôleur `/api` du plugin avec `'plugin'`. Les effets métier sont des listeners de l'event `TelemetryIngested` (`app/events/`).

1. `prepare` : la source est celle du lot et est activée ; ≤ 500 échantillons (`TELEMETRY_MAX_BATCH_SIZE`) ; chemin dans la liste blanche ; `recordedAt` lisible et pas plus de 5 minutes dans le futur (D9) ; `value` fini et dans la plage de `numeric(14,4)` pour un chemin numérique, `valueJson` pour un chemin structuré.
2. Insertion par tranches de 100 : `INSERT … ON CONFLICT (source_id, path, recorded_at) DO NOTHING RETURNING id`. Le nombre de lignes rendues donne `accepted`, la différence `ignored` (D4).
3. `touchLastSeen` (date posée, `lastError` effacé), journal, puis event.

Erreurs (`app/exceptions/instrument_errors.ts`) : `InstrumentSourceNotFoundError`, `InstrumentSourceDisabledError`, `InvalidInstrumentBaseUrlError`, `TelemetryBatchTooLargeError`, `TelemetryPathNotAllowedError`, `TelemetryRecordedAtInvalidError`, `TelemetryValueOutOfRangeError`, `TelemetryValueKindMismatchError`.

### Contrat du lot (`TelemetryBatchPayload`, aussi celui du futur plugin)

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

## Fichiers

```
app/models/boat_instrument_source.ts, boat_telemetry_sample.ts
app/services/instrument_source_service.ts, telemetry_ingest_service.ts, telemetry_read_service.ts
app/controllers/instrument_sources_controller.ts, boat_telemetry_controller.ts
app/policies/instrument_source_policy.ts
app/transformers/instrument_transformer.ts
app/validators/instruments.ts
app/events/telemetry_ingested.ts, app/listeners/on_telemetry_ingested.ts
app/services/engine_hours_sync_service.ts, position_sync_service.ts
app/exceptions/instrument_errors.ts
app/utils/csp_connect_src.ts
shared/types/instruments.ts, shared/constants/instruments.ts, shared/helpers/instruments.ts
inertia/lib/signalk/*, inertia/composables/use_instrument_stream.ts, use_telemetry_sync.ts
```
