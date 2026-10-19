# Domaine — File hors-ligne et protocole de rejeu (#481, #490, #622, #696)

## Objectif fonctionnel

Les écrans de terrain s'ouvrent sur un ponton ou en mer, souvent sans réseau.
Une mutation lancée hors-ligne est **mise en file** dans IndexedDB, puis
**rejouée** au retour de la connexion. Le rejeu ne peut pas être aveugle : entre
la saisie et le retour du réseau, la ressource a pu changer, disparaître, ou le
serveur peut refuser l'opération.

Le protocole qui porte tout ça tient dans **cinq clés de flash** et un
**vocabulaire d'identifiants d'actions**. Il est décrit ici parce qu'il traverse
trois couches — contrôleur, middleware Inertia, composable — et que chacune n'en
voit qu'un bout.

## La chaîne, de bout en bout

```
Composant Vue                     Serveur                       Composable
─────────────                     ───────                       ──────────
enqueue({ type, url, method })
  → IndexedDB
                    ── retour du réseau ──►
                                  contrôleur
                                    session.flash('conflictType', …)
                                  InertiaMiddleware.share()
                                    flash: inertia.always({ … })
                    ◄── page.props.flash ──
                                                       drainQueue()
                                                         compare flash.<type>
                                                         à action.type
```

Le rapprochement est une **égalité de chaînes** :

```ts
if (flash?.conflictData && flash?.conflictType === action.type) {
```

Si l'une des trois couches laisse tomber sa part, rien ne casse bruyamment :
l'action reste en file, ou pire, est supprimée comme si tout s'était bien passé.

## Les cinq clés

| Clé                   | Posée par                            | Lue par `drainQueue` pour                                    |
| --------------------- | ------------------------------------ | ------------------------------------------------------------ |
| `conflictType`        | contrôleur, sur `…ConflictError`     | reconnaître que **cette** action est en conflit              |
| `conflictData`        | idem                                 | peupler la modale — **chaîne JSON**, `JSON.parse` côté front |
| `rejectedType`        | contrôleur, sur un refus métier      | ranger l'action dans `failed` comme un vrai 4xx              |
| `createdResourceType` | contrôleur, sur une création réussie | reconnaître la création dont on attend l'ID                  |
| `createdResourceId`   | idem                                 | résoudre les `tempId` des actions dépendantes                |

Elles transitent par le bloc `flash` de `InertiaMiddleware.share()`, qui les
recopie **une par une**. Ce bloc est un `inertia.always()` : un rejeu se termine
souvent par un rechargement partiel (`only: [...]`), et une prop ordinaire
disparaîtrait de la réponse.

`tests/unit/middleware/inertia_offline_protocol.spec.ts` tient ce maillon. Il est
indispensable : les specs fonctionnelles prouvent que le contrôleur **pose** le
flash, jamais qu'il **arrive**. Retirer une clé du `return` du middleware laisse
les 58 cas concernés entièrement verts.

## Le vocabulaire d'actions

`shared/constants/offline_queue.ts` est, depuis **#726**, la **source unique**
du vocabulaire : chaque identifiant y est déclaré une fois, et les deux moitiés
l'importent — contrôleurs, formulaires Vue et les cartes de la modale de
conflit, sorties dans `inertia/lib/conflict_fields.ts` (#970). Le fichier exporte aussi `OFFLINE_ACTION_TYPES`
et l'union fermée `OfflineActionType`, qui type le `type` d'une `QueuedAction` :
un renommage casse désormais à la compilation plutôt qu'en mer.

| Type                          | Constante                            | Conflit détecté | `rejectedType` | Carte `FIELDS_BY_TYPE` |
| ----------------------------- | ------------------------------------ | --------------- | -------------- | ---------------------- |
| `create-inspection`           | `CREATE_INSPECTION_ACTION`           | —               | ✅             | —                      |
| `update-inspection`           | `UPDATE_INSPECTION_ACTION`           | ✅              | ✅             | ✅                     |
| `create-inspection-defect`    | `CREATE_INSPECTION_DEFECT_ACTION`    | —               | ✅             | —                      |
| `update-navigation-log`       | `UPDATE_NAVIGATION_LOG_ACTION`       | ✅              | —              | ✅                     |
| `close-navigation-log`        | `CLOSE_NAVIGATION_LOG_ACTION`        | ✅              | —              | ✅                     |
| `update-sheet-item`           | `UPDATE_SHEET_ITEM_ACTION`           | ✅              | —              | ✅                     |
| `update-navigation-log-entry` | `UPDATE_NAVIGATION_LOG_ENTRY_ACTION` | ✅              | —              | ✅                     |
| `create-navigation-log`       | `CREATE_NAVIGATION_LOG_ACTION`       | —               | ✅             | —                      |
| `create-navigation-log-entry` | `CREATE_NAVIGATION_LOG_ENTRY_ACTION` | —               | ✅             | —                      |
| `create-fuel-log`             | `CREATE_FUEL_LOG_ACTION`             | —               | ✅             | —                      |
| `increment-engine-hours`      | `INCREMENT_ENGINE_HOURS_ACTION`      | —               | ✅             | —                      |
| `create-incident`             | `CREATE_INCIDENT_ACTION`             | —               | ✅             | —                      |
| `update-incident`             | `UPDATE_INCIDENT_ACTION`             | ✅              | ✅             | ✅                     |
| `upload-photos`               | `UPLOAD_PHOTOS_ACTION`               | —               | ✅             | —                      |
| `toggle-diagnostic-step`      | `TOGGLE_DIAGNOSTIC_STEP_ACTION`      | —               | ✅             | —                      |
| `ingest-telemetry`            | `INGEST_TELEMETRY_ACTION`            | —               | ✅             | —                      |

`tests/unit/hygiene/offline_protocol_vocabulary.spec.ts` relit les sources — il
n'importe pas les constantes, une garde qui partagerait sa source avec sa cible
hériterait de ses angles morts. Il tient trois choses : **aucun littéral** ne
réapparaît (le contournement qui rouvrirait #726), les deux moitiés se
**répondent**, et aucune constante déclarée n'est **morte**.

Plus aucun ❌ depuis #970 : l'édition d'un incident, dernier trou du tableau,
porte son verrou optimiste. Les deux `rejectedType` des incidents, longtemps le dernier trou du protocole, sont
renvoyés par `BoatIncidentsController` depuis #816 — la liste d'exemptions de
la garde (`ENQUEUED_WITHOUT_SERVER_ANSWER`) est vide, mais reste en place :
c'est là qu'un prochain trou devra s'écrire, avec sa raison. Un « — » signale
au contraire un marqueur qui n'a pas lieu d'être.

### Ce que coûte une case vide

- **pas de `conflictType`** : la mutation écrase la version du serveur, dernier
  rejeu gagnant, sans que personne n'arbitre. C'était le cas de l'édition d'un
  point de journal jusqu'à #725 ;
- **pas de `rejectedType`** : un refus métier rendu en `flash('error')` +
  redirection est **indistinguable d'un succès**. `drainQueue` supprime l'action
  de la file et affiche « synchronisation réussie » — la saisie est perdue.
  C'était le cas des quatre créations du domaine terrain jusqu'à #727 ;
- **pas de `FIELDS_BY_TYPE`** : la modale s'ouvre, demande de trancher, et
  n'affiche aucune ligne.

## Verrou optimiste

Six mutations envoient `_expectedUpdatedAt` avec leur payload : depuis #725
l'édition d'un point de journal, depuis #970 celle d'un incident. C'est l'écran où le verrou compte le
plus : un point se saisit **en mer**, précisément là où il n'y a pas de réseau. Le service
compare à l'`updated_at` en base et lève une erreur de conflit si l'horodatage a
bougé — c'est ce qui distingue « ma version est périmée » de « le serveur a
refusé ».

`conflictData` porte alors **la ligne du serveur**, sérialisée en JSON. Les
champs qu'elle doit contenir sont ceux que `FIELDS_BY_TYPE`
(`inertia/lib/conflict_fields.ts`) affiche pour ce type ; le contrat est tenu par
`tests/functional/navigation/offline_conflict_payload.spec.ts`, qui ouvre le
JSON au lieu de constater la présence de la clé.

### L'édition d'un incident (#970)

`BoatIncidentRow.updatedAt` est servi par `toIncident`. Hors-ligne,
`useIncidentPhotoFlow` l'enfile en `_expectedUpdatedAt` avec l'édition.
`BoatIncidentService.updateForBoat` le compare avant toute écriture et lève
`BoatIncidentConflictError` avec la ligne du serveur (`ConflictIncidentSnapshot`).
Deux éditions hors-ligne du même incident fusionnent (`dedupeKey`
`update-incident:<url>`) : rejouées l'une après l'autre, la seconde buterait sur
le verrou posé par la première. Sans `_expectedUpdatedAt`, l'édition en ligne
garde son comportement.

### Conflits en lot (#970)

Après deux à quatre semaines en mer, le drain peut remonter des dizaines de
conflits. Jusqu'à #970, le premier mettait toute la file en pause et la modale
les présentait un par un.

- **La file ne s'arrête plus.** Une action en conflit reste dans IndexedDB (un
  rechargement la rejoue et retrouve le conflit), rejoint `conflicts`, et le
  drain passe à la suivante. Les passes suivantes la sautent tant qu'elle n'est
  pas tranchée.
- **Une seule modale**, ouverte tant que `conflicts` n'est pas vide. Les conflits y sont groupés
  par bateau puis par type (`groupConflicts`), dans l'ordre de la file. Le nom
  du bateau vient de `conflictData` : `toConflictData`
  (`app/transformers/offline_conflict_transformer.ts`) l'ajoute à la ligne du
  serveur dans les cinq contrôleurs, le client n'ayant pas la liste des bateaux.
- **Trancher** : chaque conflit a ses deux boutons (`resolveConflict(id, choice)`),
  le pied de modale tranche tout (`resolveAllConflicts`). Un conflit seul garde
  la présentation d'avant. « Garder ma version » ré-enfile l'action avec
  l'`updatedAt` du serveur, comme avant.
- **Bilan de passe** (`DrainReport`) : un seul toast quand plus rien n'est
  rejouable. Il dit « N entrées synchronisées » si tout est passé, sinon
  `common.offline.syncSummary` (envoyées, refusées, en conflit), en erreur dès
  qu'un refus existe. Il remplace le toast `syncRejected` qui suivait chaque
  refus. « Synchronisation en cours… » ne s'affiche qu'au début de la passe.
- **Lecture des valeurs** : `conflictRows` traduit les énumérations
  (`incidents.type.*`, `incidents.status.*`) et les booléens. Il formate les
  horodatages avec `formatDateTime` et compare une heure murale locale à l'ISO
  du serveur à la minute près, au lieu de comparer les chaînes.

Limite connue : deux actions en conflit sur la même ligne (une mise à jour puis
la clôture d'une sortie) gardent chacune l'`updatedAt` lu au moment du conflit.
« Garder ma version partout » rejoue la première, ce qui fait bouger le jeton :
la seconde revient en conflit au passage suivant. Une modale de plus, rien de
perdu.

## Dépendances et identifiants temporaires (#622)

Une action peut porter un `tempId`, et une autre `dependsOn` ce `tempId` : la
seconde n'est rejouée qu'une fois la première acceptée, son URL et son payload
réécrits avec l'identifiant réel (`resolveTempId`). Si la création réussit mais
que le serveur ne renvoie pas `createdResourceId`, tous les dépendants
**cascadent en `failed`** avec `dependencyBlocked`.

Un seul écran pose un `tempId` aujourd'hui : le formulaire d'état des lieux. Les
quatre créations du domaine terrain n'en posent pas — mais les trois qui ouvrent
une ressource (`create-navigation-log`, `create-navigation-log-entry`,
`create-fuel-log`) renvoient désormais `createdResourceType` /
`createdResourceId` (#727) : le jour où l'une d'elles posera un `tempId`, ses
dépendants seront résolus au lieu de cascader en `dependencyBlocked`.
`increment-engine-hours` n'ouvre aucune ressource et n'en renvoie pas.

`create-incident` les renvoie lui aussi, mais pour une autre raison : la photo
étant devenue obligatoire à la déclaration, le formulaire enchaîne un POST
multipart sur `…/incidents/:id/photos` et a besoin de l'id rendu par le flash
(cf. `docs/domain/incidents.md`). Depuis #969, la file s'en sert aussi : un
incident déclaré hors-ligne **avec** photos porte un `tempId`, et l'action
`upload-photos` qui le suit en dépend — son URL `…/incidents/<tempId>/photos`
est réécrite avec l'id réel au rejeu (voir « Photos hors-ligne »).

Hors-ligne, la photo reste **facultative** : mieux vaut un incident déclaré
sans photo sur un ponton qu'une saisie perdue. C'est le refus de clôture côté
serveur (`photoRequiredToClose`) qui la réclame au retour du réseau.

## Session expirée et erreurs transitoires (#950)

Deux cas où le rejeu n'atteint **pas** le contrôleur, et où la file doit
pourtant garder la saisie :

- **Session expirée.** `auth_middleware` redirige vers `/login`, qu'Inertia
  suit comme un succès. `drainQueue` vérifie la shared prop `user` avant
  d'envoyer et dans `onSuccess` : absente, la file passe en
  `suspendedReason = 'auth'`, rien n'est supprimé, rien ne cascade vers
  `failed`. La page de connexion vit dans le layout `auth` ; au remontage de
  `default.vue` (`resumeQueueIfSuspended`), le drain reprend. L'état est
  module-level et survit à la navigation Inertia.
- **5xx / coupure.** `onFinish` sans règlement programme une relance différée
  (`shared/helpers/offline_retry.ts` : 1 s, doublé, plafonné à 5 min). Succès,
  refus 4xx ou file vide remettent `retryAttempt` à zéro ; le passage
  hors-ligne ou dégradé annule le timer (`cancelScheduledRetry`), la prochaine
  probe `/up` réussie relançant de toute façon le drain.

## Connectivité réelle (#953)

`navigator.onLine` est vrai dès que le Wi-Fi de bord est associé, WAN mort ou
non (Starlink en obstruction). Se synchroniser sur l'événement `online` brut
lançait un drain qui échouait en boucle.

`inertia/composables/use_connectivity.ts` combine le navigateur et une probe
`HEAD /up` (timeout 5 s, `cache: 'no-store'`, exclue du service worker) :

| État       | Condition                                       | Prochaine probe        |
| ---------- | ----------------------------------------------- | ---------------------- |
| `offline`  | `navigator.onLine === false`                    | à l'événement `online` |
| `degraded` | `/up` injoignable, en erreur (503) ou trop lent | 30 s                   |
| `online`   | `/up` a répondu 2xx                             | 5 min                  |

Les probes se mettent en pause quand l'onglet passe en arrière-plan
(`visibilitychange`) et repartent immédiatement au retour. L'événement `online`
ne fait que déclencher une probe : l'état reste `offline` tant qu'elle n'a pas
répondu.

`default.vue` démarre la surveillance (`useConnectivity()`) et relance
`drainQueue` à **chaque probe réussie** si la file n'est pas vide — y compris
au chargement de la page. Le bandeau a trois états : rien en ligne,
« hors-ligne » ou « réseau instable ». `useNetworkStatus()` en dérive pour les
formulaires : `isOnline` est faux hors-ligne **et** en dégradé, la saisie part
alors en file au lieu d'un envoi direct voué à l'échec.

## Navigation Inertia hors-ligne (#968)

Le service worker ne met en cache que les **navigations pleine page** des pages
terrain (`inertia-pages`) : une visite Inertia est un XHR `X-Inertia` qui
répond du JSON sur la même URL, et la cacher sous la même clé servirait du JSON
à un document. Hors-ligne, un clic sur un `<Link>` échouait donc sans rien
afficher — seul un rechargement complet servait la page en cache.

`inertia/utils/offline_navigation.ts`, installé dans `inertia/app.ts`, écoute
l'événement `exception` du routeur Inertia. Quand une visite **GET** n'obtient
**aucune réponse** (erreur réseau, pas une 4xx/5xx), il annule le rejet,
relance une probe de connectivité et bascule en `window.location.assign` : le
SW sert la copie en cache ou `/offline.html`. Restent exclus les mutations (la
file s'en charge), les préchargements (`Purpose: prefetch`) et les
rechargements partiels (`X-Inertia-Partial-Component`). Une seule bascule par
page : la suivante est un chargement de document, elle ne peut pas reboucler.

La bascule ne dépend pas de l'état de connectivité : au moment du clic, la
dernière probe peut dater de 5 minutes. L'absence de réponse fait foi.

## Préparer la traversée (#967)

Le SW ne gardait que les pages **déjà visitées**, 7 jours / 30 entrées : sur
une traversée de 2 à 4 semaines, une page jamais ouverte tombait sur
`/offline.html` et les premières visitées disparaissaient. Et même en cache,
la fiche bateau s'ouvrait vide : ses onglets sont des props `inertia.defer`,
chargées par un rechargement partiel XHR qui échouait hors-ligne.

- **Rétention.** `inertia-pages` passe à 35 jours / 120 entrées (6 documents
  par bateau préparé : une flotte de 15 bateaux plus les visites au fil de
  l'eau). Constantes dans `inertia/lib/offline_cache.ts`, partagées par le SW
  et l'écran.
- **Props différées.** Nouveau cache `inertia-data` (NetworkFirst 3 s,
  35 jours / 240 entrées) pour les GET `X-Inertia-Partial-Component` des pages
  terrain, sous la clé `inertiaDataCacheKey` (URL + composant + props triées,
  `?tab=` ignoré). Une réponse redirigée (session expirée) ou non Inertia n'y
  entre jamais.
- **Pré-chargement.** Menu « ⋯ » de la fiche bateau → « Préparer la
  traversée » (`PassagePreparationModal.vue`). Pour la fiche, ses quatre
  onglets terrain (journal, fiches d'entretien, carburant, incidents) et le
  planning : le **document** est demandé au SW par message
  (`passage:warm-page`, réseau seul puis mise en cache avec les plugins de la
  route, `redirect: 'manual'` pour ne jamais ranger /login), puis les **props
  différées** sont réclamées comme le ferait le client Inertia (visite
  `X-Inertia`, puis un partiel par groupe de `deferredProps`) — une fois par
  URL sans `?tab=`. Pages traitées une par une, statut par page ; un SW qui ne
  répond pas en 30 s compte comme un échec.
- **Check-list.** Stockage persistant (demandé au clic, #952), espace libre
  (`refreshStorageEstimate`, alerte sous 50 Mo), pages en cache et date de
  leur copie (en-tête `Date` lu dans `inertia-pages`), file hors-ligne vide
  (en attente et en échec), session : la date de retour est comparée à
  `SESSION_IDLE_DAYS` (30 j). Le remember-me (#951) n'est pas lisible côté
  client (cookie httpOnly) : au-delà de 30 jours, c'est un avertissement qui
  invite à se reconnecter avec « Rester connecté », pas un échec.

- **Diagnostic de panne (#981).** Pour chaque moteur éligible
  (`isDiagnosticEligibleEngine`), l'écran ajoute l'index `/diagnostic` (une
  fois), la checklist du moteur et les fiches de sa famille (`sheetsForEngine`).
  Une seule ligne par moteur dans la modale : ses fiches (8 à 10) sont rangées
  dessous (`extraUrls`), la ligne échoue si l'une d'elles échoue, et sa date est
  celle de la plus vieille copie — `null` dès qu'une fiche manque.
  `TERRAIN_PATH` couvre désormais `/diagnostic`. Une étape cochée hors-ligne
  part en file (`toggle-diagnostic-step`, `PATCH`, une `dedupeKey` par moteur et
  par étape) ; le payload porte l'état voulu, donc pas de verrou optimiste. Le
  contrôleur flashe `rejectedType` sur ses trois refus (moteur supprimé, plus
  éligible, étape inconnue). La réinitialisation (`DELETE`) n'entre pas dans la
  file : le bouton est désactivé hors-ligne.

Logique pure dans `inertia/lib/passage_preparation.ts`, branchement SW et
caches dans `inertia/composables/use_passage_preparation.ts`.

## Photos hors-ligne (#969)

La file ne transportait que du `FormDataConvertible` (#621) : une photo
d'avarie prise en mer ne pouvait pas être saisie dans l'app avant le retour du
réseau. Une `QueuedAction` porte désormais des **pièces jointes**
(`attachments: QueuedAttachment[]`, `{ field, name, type, data }`).

- **Stockage.** Les octets sont gardés en `ArrayBuffer`, dans l'enregistrement
  de l'action — pas en `Blob` : un `Blob` en IndexedDB a longtemps été perdu par
  Safari iOS, et ne se clone pas hors navigateur (`fake-indexeddb`). Pas de
  montée de version : le champ est optionnel. Les réécritures (`resolveTempId`,
  passage en échec, reprise) reportent les pièces jointes via `optionalFields`.
- **Rejeu.** `drainQueue` reconstruit les `File` (`attachmentFiles`), les ajoute
  au payload sous leur `field` et passe `forceFormData` : la requête est celle
  de l'envoi en ligne (`files[]`, format `brackets` d'Inertia). Rejeu réussi →
  l'action et ses octets quittent la file.
- **Réduction.** `inertia/lib/offline_photos.ts` : plus grand côté à 2048 px,
  JPEG qualité 0,8 (`createImageBitmap` + canvas), soit ~0,5 Mo par photo. GIF
  (animation) et HEIC (non décodable hors Safari) partent tels quels ; un
  décodage impossible ou un résultat plus lourd rendent l'original. Une photo
  encore au-dessus de `PHOTO_MAX_SIZE_MB` est refusée avant la mise en file.
- **Quota.** `hasRoomFor` compare la taille du lot à
  `navigator.storage.estimate()` en gardant 20 Mo de marge (caches du SW,
  #967). Place insuffisante → toast `common.offline.photos.quotaExceeded`, rien
  n'est enfilé. Sans estimation, la photo est acceptée ; un
  `QuotaExceededError` réel reste attrapé (`saveFailed`).
- **Branchements.** `useOfflinePhotos().queuePhotos({ url, files, dependsOn? })`
  est appelé par `usePhotoUpload` (galerie du bateau, `MediaPhotoGallery` :
  équipements, incidents, états des lieux) et par `useIncidentPhotoFlow` dès que
  `isOnline` est faux — hors-ligne **ou** réseau dégradé (#953). Les boutons
  restent actifs, un bandeau `role="status"` dit que les photos attendent.
- **Vignettes.** `usePendingPhotos(uploadUrl)` lit `pendingActions`, crée une
  URL d'objet par pièce jointe et la révoque quand la photo quitte la file ou
  que la galerie disparaît ; `PendingPhotoTiles.vue` les affiche avec un badge
  « En attente ».
- **Refus.** Les quatre contrôleurs d'envoi (`BoatMediaController.storePhoto` et
  `storeInspectionPhoto`, `BoatEquipmentMediaController.store`,
  `BoatIncidentMediaController.store`) flashent `rejectedType = upload-photos`
  quand **aucune** photo du lot n'a pu être enregistrée, et sur leurs refus
  avant envoi : équipement ou incident disparu, réservation ou état des lieux
  introuvable, état des lieux signé. Le lot part dans les échecs, octets
  compris, et peut être repris. Un lot **partiel** reste un succès : les photos
  refusées sont perdues, comme en ligne.

## Stockage persistant (#952)

Sans `navigator.storage.persist()`, le navigateur peut évincer la base
IndexedDB de la file et les caches du service worker : iOS au bout de 7 jours
sans visite hors PWA installée, Android sous pression disque. Une traversée de
2 à 4 semaines y perdrait ses saisies.

`inertia/composables/use_persistent_storage.ts` demande la persistance sur deux
gestes utilisateur : l'événement `appinstalled` (`use_pwa_install.ts`) et
l'ajout d'une **nouvelle** action par `enqueue` (un upsert par `dedupeKey` ne
redemande rien). Une seule demande par chargement de page, même refusée ; si
`persisted()` est déjà vrai, `persist()` n'est pas rappelé. L'API absente, un
refus ou une erreur rendent `false`, sans exception. `usePersistentStorage()`
expose `persisted` et `estimate` (`usage`/`quota`, rafraîchi après la demande)
pour le futur écran `/sync`.

## Où c'est testé

| Fichier                                                        | Maillon                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `tests/inertia/use_offline_queue.spec.ts`                      | suspension `auth`, reprise, relance différée (#950)        |
| `tests/inertia/use_connectivity.spec.ts`                       | probe `/up`, trois états, intervalle adaptatif (#953)      |
| `tests/inertia/use_persistent_storage.spec.ts`                 | stockage persistant : absent, refusé, accordé (#952)       |
| `tests/inertia/offline_navigation.spec.ts`                     | bascule en navigation pleine page sans réponse (#968)      |
| `tests/browser/offline_navigation.spec.ts`                     | la même bascule, sur un vrai clic de lien (#968)           |
| `tests/inertia/offline_cache.spec.ts`                          | clé `inertia-data`, garde de mise en cache (#967)          |
| `tests/inertia/use_passage_preparation.spec.ts`                | pré-chargement : SW, props différées, échecs (#967)        |
| `tests/inertia/passage_preparation.spec.ts`                    | pages préparées (diagnostic #981) et check-list (#967)     |
| `tests/inertia/passage_preparation_modal.spec.ts`              | écran de préparation (#967)                                |
| `tests/unit/middleware/inertia_offline_protocol.spec.ts`       | les cinq clés traversent le middleware                     |
| `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts`       | les deux moitiés du vocabulaire coïncident                 |
| `tests/functional/navigation/offline_conflict_payload.spec.ts` | `conflictData` porte les champs de la modale               |
| `tests/functional/boats/navigation_logs.spec.ts`               | le contrôleur pose son flash de conflit                    |
| `tests/functional/boats/navigation_log_entry_conflict.spec.ts` | le verrou de l'édition d'un point, dans les deux sens      |
| `tests/functional/boats/inspections.spec.ts`                   | `rejectedType`, `createdResourceType`, `createdResourceId` |
| `tests/functional/boats/offline_replay_markers.spec.ts`        | les mêmes marqueurs sur les quatre créations du terrain    |
| `tests/functional/boats/maintenance_sheets.spec.ts`            | le conflit de ligne de fiche                               |
| `tests/inertia/offline_pending_queue.spec.ts`                  | la lecture côté composant                                  |
| `tests/inertia/offline_photos.spec.ts`                         | réduction des photos, garde de quota (#969)                |
| `tests/inertia/use_offline_photos.spec.ts`                     | mise en file avec pièces jointes, vignettes (#969)         |
| `tests/functional/boats/offline_photo_replay.spec.ts`          | rejeu multipart et `rejectedType` des envois (#969)        |
| `tests/functional/boats/incident_conflict.spec.ts`             | le verrou de l'édition d'un incident (#970)                |
| `tests/inertia/conflict_fields.spec.ts`                        | lignes de la modale, regroupement des conflits (#970)      |
| `tests/inertia/conflict_resolution_modal.spec.ts`              | modale en lot : groupes, choix un par un ou partout (#970) |
| `tests/browser/offline_conflicts_batch.spec.ts`                | drain avec trois conflits, arbitrage en lot (#970)         |
| `tests/browser/offline_photos.spec.ts`                         | photo prise hors-ligne puis synchronisée (#969)            |
| `tests/browser/offline_queue.spec.ts`                          | **le raccord complet, dans un vrai navigateur** (#700)     |

> ⚠️ **Le flash ne franchit pas deux appels client en test.**
> `SESSION_DRIVER=memory` : `page.props.flash` revient vide sur la requête
> suivante, même en reportant le cookie de session. C'est pourquoi la traversée
> du middleware se teste au niveau du middleware. Détaillé dans
> `docs/dev/testing.md`.

### Le cycle complet, mesuré dans un navigateur (#700)

Cette limite a une conséquence longtemps restée sans réponse : **les deux moitiés du protocole
étaient prouvées séparément, jamais cousues**. Dans un vrai navigateur le cookie de session porte
le flash, et la couture devient observable — c'est le seul endroit où elle l'est.

`tests/browser/offline_queue.spec.ts` (6 cas) mesure, sur `/boats/:id?tab=navigation-logs` :

| Cas                                | Ce qu'il fixe                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| création hors-ligne                | la saisie entre dans la file, **zéro ligne en base**                            |
| retour en ligne                    | l'événement `online` déclenche la probe `/up` ; sa réussite vide la file (#953) |
| bouton « Sync now »                | l'autre voie de déclenchement, isolée de la première                            |
| édition serveur pendant la coupure | la modale de conflit s'ouvre ; l'action **reste en file** jusqu'à l'arbitrage   |
| « Use server version »             | l'action est abandonnée, la ligne serveur intacte                               |
| « Keep my changes »                | l'action est ré-enfilée avec `_expectedUpdatedAt` et franchit le verrou         |

Deux contraintes à connaître avant d'en écrire un autre :

- **Ne jamais naviguer pendant la coupure.** Le service worker est désactivé sous test
  (`vite.config.ts`, #496) : aucune page n'est en cache. `enqueue()` court côté client avant toute
  requête réseau, le parcours n'en a pas besoin.
- **Isoler le bouton de l'événement.** `setOffline(false)` émet `online`, qui déclenche la probe
  `/up` dont la réussite relance `drainQueue` (#953) : pour mesurer le bouton seul, il faut fermer la page **avant** de rétablir le
  réseau (IndexedDB est attaché au contexte, la file survit).

## Constats ouverts

Aucun depuis #970 : l'édition d'un incident porte son verrou optimiste.

## Actions silencieuses : la télémétrie des instruments (#989)

`QueuedAction.silent` (booléen optionnel, reporté à chaque réécriture par `optionalFields`) supprime le bruit d'une action **de fond** : pas de toast à l'ajout, pas de toast « synchronisation en cours », et un succès n'entre pas dans le bilan de fin de passe. Elle reste comptée dans `OfflinePendingQueue` (libellé `common.offline.queue.type.ingest-telemetry`), et un refus la range dans `failed` avec le toast d'erreur du bilan, comme toute autre action.

`ingest-telemetry` (`POST /boats/:boatId/telemetry`) en est le seul usage. Pas de `dedupeKey` : il **remplace** le payload d'une action existante, ce qui perdrait des échantillons — le rejeu est rendu idempotent par la contrainte unique du serveur. Le contrôleur répond sans flash en cas de succès, et pose `rejectedType = ingest-telemetry` sur un refus (source supprimée ou désactivée, chemin inconnu, horloge dans le futur, lot trop gros). Détail : [`instruments.md`](instruments.md).
