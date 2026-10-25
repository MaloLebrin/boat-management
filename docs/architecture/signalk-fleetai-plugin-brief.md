# Plugin Signal K `signalk-fleetai` — brief et contrat (#1024)

> Épopée [#986](https://github.com/MaloLebrin/boat-management/issues/986), suite « auto-installation » : script d'installation [#1021](https://github.com/MaloLebrin/boat-management/issues/1021), page publique [#1022](https://github.com/MaloLebrin/boat-management/issues/1022), assistant [#1023](https://github.com/MaloLebrin/boat-management/issues/1023), **plugin [#1024](https://github.com/MaloLebrin/boat-management/issues/1024)**.
> Dépôt du plugin : **[MaloLebrin/signalk-fleetai](https://github.com/MaloLebrin/signalk-fleetai)** — paquet npm `signalk-fleetai`, licence MIT, TypeScript, Node ≥ 18, serveur Signal K 2.x. **Version minimale attendue par FleetAi : `0.1.0`.**
> Contrat serveur : `docs/domain/instruments.md` § « Plugin Signal K » (PR 7, #994) ; cibles AIS § « Cibles AIS » (#1009).

Le plugin vit hors de ce dépôt : il ne partage aucun code avec FleetAi, seulement ce contrat. Ce document est la référence côté FleetAi de ce que le plugin envoie, et le fixture `tests/fixtures/signalk_plugin_batch.json` en est l'exemple exécutable (`tests/functional/instruments/telemetry_ingest.spec.ts`, groupe « contrat du plugin »). **Toute évolution du contrat se fait ici d'abord**, puis dans le plugin.

## Ce que fait le plugin

Installé sur le serveur Signal K du bord (Appstore, ou `curl -fsSL {instance}/install/signalk-plugin.sh | FLEETAI_TOKEN=… bash`), il **lit** les deltas du serveur et **pousse** des lots à FleetAi dès que le bord a Internet. Il n'écrit jamais dans Signal K (`handleMessage` n'est pas appelé) et n'expose aucune route.

- **Configuration** (`plugin-config-data/signalk-fleetai.json`, schéma JSON exposé au serveur) : `endpoint` (défaut `https://fleetai.app/api/instruments/ingest`), `token` (secret, préfixe `fai_ing_`, widget mot de passe dans l'admin), `periodSeconds` (défaut 60, borné 10–3600), `paths?` (liste blanche **supplémentaire** de chemins numériques ou jokers Signal K). Jeton absent ou mal formé, endpoint non `http(s)` → `app.setPluginError` explicite, pas d'abonnement.
- **Abonnements** : `vessels.self` avec un joker par motif du catalogue (`propulsion.*.runTime`, `navigation.position`, `electrical.batteries.*.voltage`, `tanks.*.*.currentLevel`, `environment.*`, `notifications.*` en `instant`…) ; `vessels.*` pour les cibles AIS (`navigation.position`, `speedOverGround`, `courseOverGroundTrue`, `closestApproach`, `design.aisShipType`, `name`), le contexte du bateau lui-même étant exclu.
- **Agrégation** : une valeur par chemin et par fenêtre, règle du catalogue (`last` / `mean` / `max`) comme `inertia/lib/signalk/aggregator.ts`. La fenêtre d'un chemin vaut `max(periodSeconds, cadence du catalogue)` : heures moteur toutes les 5 min, capacité de réservoir toutes les heures, cible AIS toutes les 5 min, alarmes à la prochaine période. **`recordedAt` = horloge du serveur Signal K arrondie au début de fenêtre** (D9), jamais le `timestamp` NMEA. Valeurs **en SI telles qu'émises** (D8).
- **Filtrage** : chemins hors catalogue (et hors `paths`), valeurs `null` / non finies, mauvais genre (objet sur un chemin numérique) sont écartés **avant** l'envoi — le serveur accepte ou refuse un lot en entier. `navigation.position` est réduite à `{ latitude, longitude }`, une alarme à `{ state, message, method }`, une cible AIS à `AisTargetValue` (`shared/types/ais.ts`) et n'est envoyée qu'avec une position.

## Requête

```
POST {endpoint}
Authorization: Bearer fai_ing_…
Content-Type: application/json
User-Agent: signalk-fleetai/<version>

{ "batchId": "<uuid v4>", "samples": [ { "path", "recordedAt", "value" | "valueJson" }, … ] }
```

- ≤ 500 échantillons par lot (`TELEMETRY_MAX_BATCH_SIZE`), découpage dans l'ordre ; **jamais de `sourceId`** (le jeton désigne la source).
- `batchId` stable d'un rejeu à l'autre (journal côté serveur, D4) ; l'idempotence réelle tient à `(source_id, path, recorded_at)`.
- Délai d'attente 30 s, redirections non suivies (le serveur répond toujours en JSON).

## Réponses et conduite à tenir

| Réponse                                                                                                                    | Plugin                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200 { accepted, ignored }`                                                                                                | Lot retiré de la file, repli remis à zéro, statut « Last batch accepted … ago ».                                                                        |
| Réseau injoignable, délai dépassé, `408`, `3xx`, `5xx`                                                                     | Lot conservé en tête de file, repli exponentiel 5 s → 10 s → … **plafonné à 5 min**, statut « Waiting for network (N batches queued) ».                 |
| `429 { error: 'rate_limited', retryAfter }`                                                                                | Attente de `Retry-After` (en-tête, sinon corps), même lot rejoué ensuite.                                                                               |
| `401 unauthorized`                                                                                                         | **Arrêt** : désabonnement, minuterie coupée, `app.setPluginError('Token rejected: …')`. Aucune nouvelle tentative tant qu'on ne réactive pas le plugin. |
| `403 plan_not_allowed`, `404 source_not_found`, `409 source_disabled`                                                      | **Arrêt** de même, message dédié (« Stopped: … »). La file reste sur disque.                                                                            |
| `422` (`validation_failed`, `path_not_allowed` + `path`, `recorded_at_invalid`, `value_invalid`, `source_mismatch`), `413` | Lot **journalisé en entier** (`app.error`) puis **abandonné** ; un `path` refusé n'est plus envoyé de la session.                                       |

## File hors-ligne

- `app.getDataDirPath()/queue.json` (`plugin-config-data/signalk-fleetai/queue.json`), écriture atomique (fichier temporaire + `rename`), mode 600.
- **Bornée à 1 440 lots** (une journée de lots à la minute) : au-delà, les plus anciens sont perdus, jamais les plus récents.
- Rejeu **dans l'ordre**, dès le prochain démarrage du serveur (les lots en attente partent avant la première fenêtre).
- À l'arrêt du plugin, les fenêtres ouvertes sont closes et mises en file sans appel réseau.

## Statuts affichés dans l'admin Signal K

`Collecting readings` → `Sending first batch (N queued)` → `Last batch accepted 2 min ago [— N queued]` ; `Waiting for network (N batches queued) — <dernière erreur>` ; erreur `Token rejected: …` ou `Stopped: …`.

## Ce que FleetAi garantit en retour

- Même pipeline que la PWA : `TelemetryIngestService.ingest(source, batch, { origin: 'plugin' })`, donc heures moteur, position, alertes et cibles AIS se mettent à jour, et `last_seen_at` est posé au premier lot accepté.
- Un lot rejoué est un succès (`ignored`), jamais un doublon.
- Les codes d'erreur ci-dessus sont **stables** : le plugin les teste par `error`, pas par message.
- Le catalogue (`INSTRUMENT_PATH_CATALOG`) n'est étendu que de façon compatible : un chemin ajouté côté serveur ne casse pas un plugin plus ancien ; un chemin retiré est d'abord déprécié (le plugin le verrait en `422 path_not_allowed`, sans boucle).

## Critères d'acceptation (issue)

- Sur `signalk-server` 2.x : Appstore → `signalk-fleetai` → URL + jeton → en moins de deux fenêtres `last_seen_at` est posé et l'onglet affiche les dernières valeurs. Vérifié le 25 octobre 2026 contre le service `signalk` du `docker-compose.yml` (trace NMEA 0183 d'exemple) : premier lot (`notifications.server.newVersion`) après 10 s, puis `navigation.*` et `environment.*` par fenêtres, `recordedAt` arrondi, aucun `sourceId`.
- Un jeton révoqué met le plugin en erreur visible sans boucler : un seul `401`, statut « Token rejected… », aucune requête ensuite, file conservée.

## Tests côté plugin (Vitest, dépôt du plugin)

Agrégation par fenêtre (`last`/`mean`/`max`, arrondi de `recordedAt`, cadences lentes), découpage en lots de 500, rejeu idempotent après `503` (même `batchId`, même contenu, ordre conservé), repli exponentiel plafonné, `Retry-After`, chaque code HTTP, persistance de la file entre deux démarrages, borne de la file, pas de double envoi concurrent, intégration du point d'entrée réel contre un faux endpoint HTTP (en-têtes, forme du lot, `vessels.*` sans le bateau lui-même, jeton révoqué). CI GitHub Actions : lint + typecheck + tests sur Node 18/20/22 à chaque PR, `npm publish` sur tag `v*` (secret `NPM_TOKEN`).
