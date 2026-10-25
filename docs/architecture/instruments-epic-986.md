# Instruments de bord via Signal K — épopée #986 : architecture, décisions, spike

> Épopée : [#986](https://github.com/MaloLebrin/boat-management/issues/986) — acquisition des données des instruments du bateau (moteur, position, énergie, réservoirs, environnement, alarmes) depuis un serveur **Signal K** à bord, par la **PWA** connectée au Wi-Fi du bateau.
> Spike : [#985](https://github.com/MaloLebrin/boat-management/issues/985), PR [#987](https://github.com/MaloLebrin/boat-management/pull/987) (ce document, la sonde `/dev/signalk-probe`, le service `signalk` du compose, `docs/dev/signalk.md`).
> **8 PR, une issue chacune**, séquencées ci-dessous. Ce document tient les décisions structurantes et les résultats du spike ; il est mis à jour à chaque PR livrée, comme `pwa-terrain-epic-481.md`.

## Encore ouvert

- [ ] Matrice contenu mixte sur appareils réels (Chrome Android, iOS Safari + PWA installée) — à remplir avec la sonde, voir « Résultats du spike ».
- [ ] Décision go/no-go iOS avant de démarrer la PR 3 (onglet) : conditionne le périmètre « PWA à bord » et l'ordre de la PR 7.
- [ ] CSP appliquée (`reportOnly: false`) à vérifier sur staging avec le helper de la PR 1.
- [x] Mesures locales (dev HTTP, serveur d'exemple) : faites, voir « Mesures locales ».

## Ce que l'on construit

Aujourd'hui FleetAi ne connaît que la saisie manuelle : heures moteur tapées (ou copiées à la clôture d'un trajet), position du téléphone (`BoatOverviewPositionCard.vue`, `use_gps_burst.ts`), pleins de carburant. Aucun relevé batterie, réservoir, régime moteur ou environnement n'est stocké ; il n'existe ni endpoint d'ingestion, ni garde par jeton, ni écran Intégrations (la FAQ marketing dit même « pas de capteurs connectés »).

Cible :

```
┌──────────── bord ────────────┐          ┌──────────────── FleetAi ────────────────┐
│ instruments NMEA 2000 / 0183 │          │                                         │
│  Victron, capteurs…          │          │  POST boats/:id/telemetry (Inertia)     │
│        │                     │  WAN     │        │                                │
│        ▼                     │ (4G,     │        ▼                                │
│  serveur Signal K ──WS/REST──┼─────────▶│  TelemetryIngestService.ingest()        │
│  (OpenPlotter, passerelle)   │ Starlink,│   ├─ boat_telemetry_samples (idempotent)│
│        ▲ Wi-Fi de bord       │ port)    │   └─ event TelemetryIngested            │
│        │                     │          │        ├─ heures moteur (PR 4)          │
│  PWA FleetAi sur             │          │        ├─ position / journal (PR 4)     │
│  téléphone / tablette        │          │        └─ alertes (PR 6)                │
│   lib signalk → agrégateur   │          │                                         │
│   → file hors-ligne ─────────┼─────────▶│  POST /api/instruments/ingest (PR 7,    │
│                              │          │   plugin Signal K + jeton par bateau)   │
└──────────────────────────────┘          └─────────────────────────────────────────┘
```

Choix cadrés avec l'exploitant :

- **Source** : Signal K uniquement (le client ne parle jamais NMEA). Les passerelles Wi-Fi NMEA brutes et les clouds constructeurs ne sont pas au périmètre.
- **Acquisition** : la PWA à bord lit le flux, **sous-échantillonne** (une valeur par chemin et par fenêtre), et envoie des **lots** via la file hors-ligne existante. L'acquisition ne tourne que **l'écran ouvert** (contrainte iOS : le JS s'arrête hors premier plan, cf. `use_gps_burst.ts`) ; Screen Wake Lock pendant le flux.
- **Données** : `propulsion.<id>.runTime|revolutions|temperature|oilPressure`, `navigation.position|speedOverGround|courseOverGroundTrue|headingTrue|speedThroughWater`, `electrical.batteries.<id>.voltage|current|capacity.stateOfCharge`, `tanks.<type>.<id>.currentLevel|capacity`, `environment.wind.*|depth.*|water.temperature`, `notifications.*`.
- **Usages** : heures moteur automatiques (maintenance), journal/historique, tableau de bord temps réel à bord, alertes.

## Décisions structurantes

### D1 — L'ingestion est agnostique du transport

`TelemetryIngestService.ingest(source, batch, { origin: 'pwa' | 'plugin' })` est l'unique entrée. Le contrôleur Inertia (PR 1) et le contrôleur `/api` à jeton (PR 7) l'appellent tous deux ; les effets métier sont des **listeners** de l'event `TelemetryIngested`, jamais dans le contrôleur. Si le chemin navigateur → LAN s'avère impraticable sur une plateforme (voir spike), rien du socle n'est perdu : seul le client change.

### D2 — Extension de la CSP par réponse, dans le contrôleur

`config/shield.ts` pose `connect-src 'self'` (appliquée en production, _report-only_ ailleurs). L'origine du serveur Signal K est **par bateau** : impossible de la déclarer statiquement.

Vérifié dans le spike : le garde CSP de Shield (`@adonisjs/shield`, bundle `frame_guard-*.js`, `cspFactory`) délègue à `helmet-csp`, qui fait `res.setHeader(headerName, result)` **de façon synchrone dans le middleware serveur**, donc avant le handler de route. Au moment où `BoatsController.show()` s'exécute, `ctx.response.response.getHeader('content-security-policy' | 'content-security-policy-report-only')` contient déjà la politique complète (nonce inclus). Le contrôleur peut donc la relire, ajouter `https://hôte:port wss://hôte:port` (plus `http://`/`ws://` hors production) à `connect-src`, et la reposer via `ctx.response.header(...)`. En test Shield est retiré du kernel (`start/kernel.ts`) : le helper est un no-op sans en-tête, et le test fonctionnel rejoue `ShieldMiddleware` comme `tests/functional/security/csp_nonce.spec.ts`.

Écartés : un middleware nommé (il court après Shield mais ne connaît pas le bateau sans requête supplémentaire sur chaque page), un schéma générique `connect-src https: wss:` (il ouvre la CSP à tout Internet). La `baseUrl` est validée à l'enregistrement (`https?://hôte[:port]`, sans chemin, paramètres ni identifiants) pour que la valeur injectée dans l'en-tête soit toujours une origine.

### D3 — Jeton Signal K chiffré, révélé seulement dans la prop différée

Le jeton (optionnel : un serveur Signal K sans compte admin est en lecture libre) est chiffré en base par `DataEncryptionService` (précédent : `OrganizationAiKey.apiKeyEncrypted`), colonne `token_encrypted` redéclarée `@column({ serializeAs: null })`. Le navigateur doit pourtant le tenir en clair pour parler au serveur : il n'est déchiffré que dans la prop **différée** `instruments` (jamais dans le HTML initial) et seulement pour un visiteur qui peut ingérer (`boats.edit`) ; les autres reçoivent `token: null`. C'est un jeton **lecture seule** d'un serveur du LAN, révocable depuis le formulaire. La prop différée est mise en cache par le service worker (`inertia-data`, #967), ce qui permet de se reconnecter au serveur de bord sans WAN.

Alternative gardée ouverte (après PR 3) : le flux _Access Requests_ de Signal K avec un jeton **par appareil** conservé uniquement dans IndexedDB.

### D4 — Idempotence des rejeux côté serveur

Unique `(source_id, path, recorded_at)` sur `boat_telemetry_samples` + `insert … onConflict().ignore()`. Pas de `dedupeKey` sur l'action de la file (il **remplace** le payload, ce qui perdrait des échantillons). Un `batchId` client (uuid) sert aux logs. Un lot rejoué deux fois (drain interrompu, 5xx) n'insère rien de plus.

### D5 — Télémétrie silencieuse dans la file hors-ligne

`enqueue()` toaste à chaque ajout et `use_flash_toasts` toaste chaque `flash.success` : un lot toutes les cinq minutes ferait du bruit. Le contrôleur d'ingestion répond **sans flash** en cas de succès (redirection seule), et la file gagne une option `silent` (toujours comptée dans `OfflinePendingQueue.vue`). Les refus métier renvoient `rejectedType = INGEST_TELEMETRY_ACTION`, comme l'exige `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts`. En ligne, le client poste avec `only: ['instruments']` pour que la redirection ne rende que la prop différée.

### D6 — Heures moteur : delta depuis une base, jamais la valeur absolue

`boat_engines.hours` est protégé par le trigger `boat_engines_hours_monotonic`. La synchronisation (PR 4) ne copie jamais `propulsion.<id>.runTime` dans `hours` : elle mémorise une **base** (`instrument_run_time_s`) par moteur et n'incrémente que des heures entières écoulées depuis cette base (`BoatEngineService.incrementHours` arrondit déjà à l'entier). Un `runTime` inférieur à la base (reset du calculateur) re-base et logge. Le rejeu d'un lot est donc idempotent par construction. L'appariement Signal K ↔ moteur se fait par `boat_engines.instrument_key` = `<id>` du chemin (`port`, `starboard`, `0`…).

### D7 — Gating par le plan

Flag `canConnectInstruments` : starter `false`, pro `true`, enterprise `true`, feature `instruments` du `requireModulePlan` (recette inventaire #892, `shared/types/plan.ts`).

### D8 — Unités : SI en base, conversion à l'affichage

Les échantillons sont stockés **tels que Signal K les émet** (SI : m/s, K, rad, Pa, ratio, s, Hz). La conversion est faite par `inertia/lib/signalk/units.ts` à l'affichage (nœuds, °C, degrés, bar, %, heures, tr/min). Piège relevé : `revolutions` est en **hertz**, pas en tr/min.

## Résultats du spike

### Ce que mesure la sonde

`GET /dev/signalk-probe` (hors production) sert `scripts/spike/signalk_probe.html`, page autonome que l'on peut aussi servir depuis n'importe quel hôte statique HTTPS pour tester sur téléphone (mode d'emploi dans `docs/dev/signalk.md`). Elle journalise : découverte REST (avec repli `targetAddressSpace` de Local Network Access), instantané, WebSocket (ouverture, abonnement, deltas, codes de fermeture, reconnexion exponentielle, heartbeat), `visibilitychange`/`pagehide`, Wake Lock, violations CSP. « Copier le rapport » produit le JSON à coller ici.

### Matrice contenu mixte

Le problème : l'app est servie en HTTPS ; les navigateurs refusent `ws://` et `http://` vers une adresse non _potentially trustworthy_ (tout sauf `localhost`/`127.0.0.1`). Un serveur Signal K sur `192.168.x.x:3000` est donc inaccessible depuis la PWA **sauf** si l'une des conditions ci-dessous est remplie.

| Scénario                                                                                            | Chrome desktop                                                                                                                                                      | Chrome Android                                                                    | iOS Safari / PWA installée                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page HTTP (dev local) → `ws://localhost:3000`                                                       | **Mesuré : OK** (voir ci-dessous)                                                                                                                                   | n/a                                                                               | n/a                                                                                                                                                                               |
| Page HTTPS → `ws://<ip-lan>:3000`                                                                   | Attendu : `SecurityError` contenu mixte ; Local Network Access peut autoriser `fetch` avec `targetAddressSpace` après invite (Chromium ≥ 138), WebSocket à vérifier | Attendu : idem Chrome desktop                                                     | Attendu : **bloqué**, aucune exception                                                                                                                                            |
| Page HTTPS → `wss://<ip-lan>:3443` certificat auto-signé                                            | Attendu : OK **après** avoir ouvert `https://<ip-lan>:3443` dans un onglet et accepté l'interstitiel                                                                | Attendu : OK après l'interstitiel (par session ; à re-vérifier après redémarrage) | Attendu : **échec** sans profil CA installé **et** marqué de confiance (Réglages → Général → Informations → Réglages des certificats) ; WebSocket parfois refusé même avec profil |
| Page HTTPS → `wss://<nom-dns>:3443` certificat Let's Encrypt (DNS-01, nom qui résout vers l'IP LAN) | Attendu : OK                                                                                                                                                        | Attendu : OK                                                                      | Attendu : OK (seul chemin sans manipulation sur l'appareil)                                                                                                                       |

Cellules « Attendu » : connaissance des plateformes, **à confirmer** avec la sonde sur les appareils de l'exploitant, rapport JSON à coller sous cette matrice. Les cellules iOS décident du périmètre.

### Mesures locales (19 octobre 2026)

Conditions : Chrome 152 (navigateur intégré), page HTTP `localhost:3333/dev/signalk-probe`, `signalk-server` 2.34.0 avec `--sample-nmea0183-data` (npx, puis le service compose `signalk`).

| Mesure                                            | Résultat                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /signalk`                                    | 200 en 149 ms ; endpoints `signalk-http`, `signalk-ws` (plus `signalk-tcp` en npx).                                                                                                                                                                                                 |
| `GET /signalk/v1/api/vessels/self`                | 200 en 375 ms, 13 chemins (navigation, environnement, performance). La trace d'exemple n'a **ni propulsion, ni électricité, ni réservoirs**.                                                                                                                                        |
| WebSocket `subscribe=none` + message d'abonnement | ouvert en 103 ms (57 ms au second essai), `hello` puis deltas. **88 deltas en 7 s** avec `policy: instant`, `minPeriod: 500` sur 17 chemins (≈ 12/s) : l'agrégation côté client (PR 2) n'est pas optionnelle, et `policy: fixed` + `period` par chemin réduira déjà le débit.       |
| CSP (report-only)                                 | une violation `connect-src` par requête REST et une pour le WebSocket, **même vers `localhost`** : l'extension de `connect-src` (PR 1) doit aussi s'appliquer en dev, sinon la console est illisible.                                                                               |
| Arrêt du serveur (`kill`)                         | `close 1006` reçu moins de 2 s après ; repli 1 → 2 → 4 → 8 → 16 s comme prévu.                                                                                                                                                                                                      |
| Redémarrage du serveur                            | serveur joignable à T+8 s, flux rouvert à T+13 s (première tentative après le retour, créneau de 16 s), compteur de reconnexions = 1, valeurs à nouveau fraîches. Plafonner le repli à ~30 s à bord est le bon ordre de grandeur.                                                   |
| Serveur en `--securityenabled` sans compte admin  | REST **401** ; **le WebSocket s'ouvre, envoie `hello`, puis n'émet aucun delta** (abonnement ignoré en silence) → heartbeat 20 s → reconnexion en boucle. Le client doit sonder le REST **avant** le WebSocket et afficher « jeton requis » (`unauthorized`) plutôt que de boucler. |
| Horodatage des deltas                             | `update.timestamp` porte l'heure de la **phrase NMEA** (09:59 pour la position GPS, 08:41 pour le reste, sur la même seconde de réception) et non l'heure de réception. Voir D9.                                                                                                    |
| Valeurs nulles                                    | `navigation.headingTrue` / `headingMagnetic` arrivent à `null` : le normaliseur (PR 2) les ignore sans écraser la dernière valeur connue.                                                                                                                                           |
| Image Docker officielle                           | `startup.sh` ajoute toujours `--securityenabled` et le premier démarrage écrit `security.strategy` dans `settings.json` du volume : le service compose lance le binaire directement (voir `docs/dev/signalk.md`).                                                                   |
| Wake Lock                                         | API présente sur Chrome desktop ; comportement en veille à mesurer sur téléphone.                                                                                                                                                                                                   |

### D9 — `recorded_at` est l'heure de réception, pas le timestamp Signal K

Conséquence de la mesure ci-dessus : une passerelle qui rejoue ou retarde des phrases NMEA, un GPS sans heure valide ou une horloge de bord fausse donneraient des échantillons datés n'importe quand, et la contrainte unique `(source_id, path, recorded_at)` ne dédupliquerait plus rien de cohérent. Le client date chaque fenêtre d'agrégation avec **sa propre horloge** (arrondie à la fenêtre) ; le `timestamp` Signal K le plus récent de la fenêtre est conservé dans `value_json` quand il porte une information (position), sinon abandonné. Le serveur refuse un `recorded_at` dans le futur de plus de 5 min ou plus vieux que la rétention.

### D10 — CSP par document, rechargement complet après changement d'origine (#1019)

`applyInstrumentCsp` n'agit que sur la **réponse HTML** de `boats.show`. Une visite Inertia (XHR) ne remplace pas le document : après `PUT /boats/:id/instrument-source`, la page garde la `connect-src` de son chargement. En production (`reportOnly: false`), le flux vers une nouvelle origine est bloqué jusqu'à un rechargement complet. `InstrumentSourceForm` fait donc `window.location.assign('/boats/:id?tab=instruments')` quand `needsFullReloadForCsp(ancienne, nouvelle)` vaut vrai (origine différente, ou aucune source avant) — même mécanisme que `offline_navigation.ts`. `base_url` reste `NOT NULL` : le rendre nullable est écarté (schéma généré, composables, util CSP, validateur, ~13 specs) ; le plugin exige de toute façon une source active.

Corollaire : une page `https:` ne peut pas appeler une adresse `http:` (contenu mixte, hors `localhost`/`127.0.0.1`). Le client lève `mixed_content` **avant tout fetch**, erreur terminale sans reconnexion ; si un jeton de plugin existe, l'onglet affiche « lecture par le plugin » au lieu d'une erreur.

### Chemin recommandé

1. **Nom DNS + certificat de confiance** sur le serveur Signal K (Let's Encrypt par défi DNS-01, le nom résout vers l'IP LAN du bateau) : fonctionne partout sans toucher aux appareils. À documenter côté utilisateur (une fois par bateau), et c'est ce que proposent déjà certaines distributions (OpenPlotter + Caddy).
2. **Repli Android / desktop** : TLS auto-signé de Signal K (`ssl: true`, port 3443) + acceptation de l'interstitiel.
3. **Repli universel sans navigateur** : PR 7, un plugin Signal K pousse les lots vers `/api/instruments/ingest` avec un jeton par bateau, dès que le bord a un WAN. Ne dépend ni du téléphone ni de la CSP.

**Règle de décision** : si iOS échoue aussi avec un certificat de confiance (cellule 4), le périmètre « PWA à bord » devient « tablette Android / portable », l'onglet (PR 3) reste utile pour afficher les **dernières valeurs connues** et l'historique, et la PR 7 passe juste après la PR 4.

### Cycle de vie en veille et Wake Lock

À mesurer avec la sonde : délai entre la mise en veille et la fermeture du WebSocket (code 1006 attendu), délai de reconnexion au retour au premier plan, maintien du flux avec Wake Lock actif (Safari ≥ 16.4 le supporte, mais le relâche dès que la page n'est plus visible). Conséquence déjà prise : l'agrégateur persiste sa fenêtre courante en IndexedDB (PR 2) pour ne rien perdre à un rechargement, et l'UI annonce « acquisition active tant que cet écran est ouvert ».

## Modèle de données (PR 1)

- `boat_instrument_sources` — une source par bateau et par `kind` (`signalk`) : `base_url`, `token_encrypted`, `vessel_context` (`vessels.self` par défaut), `enabled`, `last_seen_at`, `last_error`, `organization_id` (pour `OrgScopedPolicy`).
- `boat_telemetry_samples` — append-only : `boat_id`, `source_id`, `path` (≤ 96), `recorded_at`, `value numeric(14,4)` ou `value_json` (alarmes, position), unique `(source_id, path, recorded_at)`, index `(boat_id, path, recorded_at desc)` pour « dernière valeur par chemin ».
- PR 4 : `boat_engines.instrument_key` + `instrument_run_time_s`, `navigation_log_entries.source` (`manual|instruments`).
- PR 6 : `boat_instrument_alert_rules`, `boat_instrument_alerts`.
- PR 7 : `boat_instrument_sources.ingest_token_hash`.

Les chemins acceptés sont une **liste blanche** (`shared/constants/instruments.ts`), partagée avec le catalogue client (catégorie, unité SI, unité d'affichage, fenêtre d'agrégation).

## Carte des PR

| #   | PR                                                                                                                                                                   | Issue                                                            | Dépend de |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------- |
| 0   | Spike faisabilité, ce document, sonde, service `signalk` de dev                                                                                                      | [#985](https://github.com/MaloLebrin/boat-management/issues/985) | —         |
| 1   | Socle backend : migrations, modèles, services, policy, validateurs, routes, gating `canConnectInstruments`, helper CSP, prop différée `instruments`                  | [#988](https://github.com/MaloLebrin/boat-management/issues/988) | —         |
| 2   | `inertia/lib/signalk/` (client, catalogue, unités, agrégateur, normaliseur) + `use_instrument_stream` / `use_telemetry_sync` + action `ingest-telemetry` silencieuse | [#989](https://github.com/MaloLebrin/boat-management/issues/989) | 1         |
| 3   | Onglet « Instruments » (bandeau de connexion, jauges par catégorie, dernières valeurs connues, formulaire de source admin), i18n, `passagePages()`                   | [#990](https://github.com/MaloLebrin/boat-management/issues/990) | 2         |
| 4   | Synchronisation métier : `runTime` → heures moteur, `navigation.position` → historique + points de journal                                                           | [#991](https://github.com/MaloLebrin/boat-management/issues/991) | 1         |
| 5   | Historique (`date_bin`), graphiques, rétention (job de purge)                                                                                                        | [#992](https://github.com/MaloLebrin/boat-management/issues/992) | 3         |
| 6   | Alertes et anomalies : règles, évaluation serveur + client, notifications et push                                                                                    | [#993](https://github.com/MaloLebrin/boat-management/issues/993) | 4         |
| 7   | Plugin Signal K qui pousse : `/api/instruments/ingest`, jeton par bateau, throttle                                                                                   | [#994](https://github.com/MaloLebrin/boat-management/issues/994) | 1         |

La PR 4 peut démarrer en parallèle de la PR 3 dès que la PR 1 est mergée.

### Critères de sortie du spike (pour PR 2 / PR 3)

- Matrice iOS renseignée (au moins les cellules 3 et 4) et décision de périmètre consignée dans « Encore ouvert ».
- Format d'origine CSP arrêté : `https://hôte:port` + `wss://hôte:port` (PR 1 l'implémente).
- Comportement de la sonde en veille consigné (délais), qui fixe `staleAfterS` et la fenêtre hors-ligne de l'agrégateur.

## Questions ouvertes

- Plusieurs téléphones à bord connectés en même temps : ils enverraient les mêmes échantillons (dédupliqués par D4) mais consommeraient chacun des visites Inertia. Élire un « collecteur » par bateau (verrou court en base, `last_seen_at` + identifiant d'appareil) — à trancher en PR 2 si le cas est réel.
- Rétention : 90 jours Pro / 365 jours Entreprise proposés en PR 5 ; à valider avec le coût de stockage réel après quelques semaines de données.
- `navTarget` de l'entrée `product_knowledge` : l'assistant n'a pas de cible par bateau ; laisser `null` tant que `ASSISTANT_NAV_TARGETS` ne porte pas de paramètre.
