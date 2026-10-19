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

L'action `INGEST_TELEMETRY_ACTION` (`ingest-telemetry`) et son `rejectedType` arrivent en **PR 2** : `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts` refuse un type que le serveur renvoie sans que le front l'enfile (et une constante que personne n'emploie). Le contrôleur d'ingestion flashe donc seulement `error` pour l'instant.

## Fichiers

```
app/models/boat_instrument_source.ts, boat_telemetry_sample.ts
app/services/instrument_source_service.ts, telemetry_ingest_service.ts, telemetry_read_service.ts
app/controllers/instrument_sources_controller.ts, boat_telemetry_controller.ts
app/policies/instrument_source_policy.ts
app/transformers/instrument_transformer.ts
app/validators/instruments.ts
app/events/telemetry_ingested.ts
app/exceptions/instrument_errors.ts
app/utils/csp_connect_src.ts
shared/types/instruments.ts, shared/constants/instruments.ts, shared/helpers/instruments.ts
```
