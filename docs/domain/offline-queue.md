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

`shared/constants/offline_queue.ts` déclare les trois actions des états des
lieux et, depuis #727 et #725, les cinq actions du domaine terrain — celles
dont le backend parle. Les autres restent des **littéraux écrits à la main des
deux côtés** : c'est la dette **#726**.

| Type                          | Conflit détecté | `rejectedType` | Carte `FIELDS_BY_TYPE` |
| ----------------------------- | --------------- | -------------- | ---------------------- |
| `create-inspection`           | —               | ✅             | —                      |
| `update-inspection`           | ✅              | ✅             | ✅                     |
| `create-inspection-defect`    | —               | ✅             | —                      |
| `update-navigation-log`       | ✅              | —              | ✅                     |
| `close-navigation-log`        | ✅              | —              | ✅                     |
| `update-sheet-item`           | ✅              | —              | ✅                     |
| `update-navigation-log-entry` | ✅              | —              | ✅                     |
| `create-navigation-log`       | —               | ✅             | —                      |
| `create-navigation-log-entry` | —               | ✅             | —                      |
| `create-fuel-log`             | —               | ✅             | —                      |
| `increment-engine-hours`      | —               | ✅             | —                      |

`tests/unit/hygiene/offline_protocol_vocabulary.spec.ts` compare les deux
moitiés en relisant les sources. Il portait les cases vides ci-dessus en
**exemptions motivées** ; il n'en reste aucune depuis #727 et #725 — la garde
couvre tout le vocabulaire enfilé. Un « — » dans le tableau signale désormais
un marqueur qui n'a pas lieu d'être, pas un marqueur qui manque.

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

Quatre mutations envoient `_expectedUpdatedAt` avec leur payload — depuis #725,
l'édition d'un point de journal comprise. C'est l'écran où le verrou compte le
plus : un point se saisit **en mer**, précisément là où il n'y a pas de réseau. Le service
compare à l'`updated_at` en base et lève une erreur de conflit si l'horodatage a
bougé — c'est ce qui distingue « ma version est périmée » de « le serveur a
refusé ».

`conflictData` porte alors **la ligne du serveur**, sérialisée en JSON. Les
champs qu'elle doit contenir sont ceux que `FIELDS_BY_TYPE` de
`ConflictResolutionModal.vue` affiche pour ce type ; le contrat est tenu par
`tests/functional/navigation/offline_conflict_payload.spec.ts`, qui ouvre le
JSON au lieu de constater la présence de la clé.

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

## Où c'est testé

| Fichier                                                        | Maillon                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `tests/unit/middleware/inertia_offline_protocol.spec.ts`       | les cinq clés traversent le middleware                     |
| `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts`       | les deux moitiés du vocabulaire coïncident                 |
| `tests/functional/navigation/offline_conflict_payload.spec.ts` | `conflictData` porte les champs de la modale               |
| `tests/functional/boats/navigation_logs.spec.ts`               | le contrôleur pose son flash de conflit                    |
| `tests/functional/boats/navigation_log_entry_conflict.spec.ts` | le verrou de l'édition d'un point, dans les deux sens      |
| `tests/functional/boats/inspections.spec.ts`                   | `rejectedType`, `createdResourceType`, `createdResourceId` |
| `tests/functional/boats/offline_replay_markers.spec.ts`        | les mêmes marqueurs sur les quatre créations du terrain    |
| `tests/functional/boats/maintenance_sheets.spec.ts`            | le conflit de ligne de fiche                               |
| `tests/inertia/offline_pending_queue.spec.ts`                  | la lecture côté composant                                  |
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

| Cas                                | Ce qu'il fixe                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| création hors-ligne                | la saisie entre dans la file, **zéro ligne en base**                         |
| retour en ligne                    | l'événement `online` relayé par `default.vue` vide la file et écrit la ligne |
| bouton « Sync now »                | l'autre voie de déclenchement, isolée de la première                         |
| édition serveur pendant la coupure | la modale de conflit s'ouvre et **la file se met en pause**                  |
| « Use server version »             | l'action est abandonnée, la ligne serveur intacte                            |
| « Keep my changes »                | l'action est ré-enfilée avec `_expectedUpdatedAt` et franchit le verrou      |

Deux contraintes à connaître avant d'en écrire un autre :

- **Ne jamais naviguer pendant la coupure.** Le service worker est désactivé sous test
  (`vite.config.ts`, #496) : aucune page n'est en cache. `enqueue()` court côté client avant toute
  requête réseau, le parcours n'en a pas besoin.
- **Isoler le bouton de l'événement.** `setOffline(false)` émet `online`, que `default.vue` relaie
  à `drainQueue` : pour mesurer le bouton seul, il faut fermer la page **avant** de rétablir le
  réseau (IndexedDB est attaché au contexte, la file survit).

## Constats ouverts

| #    | Constat                                              |
| ---- | ---------------------------------------------------- |
| #726 | vocabulaire d'actions écrit à la main des deux côtés |
