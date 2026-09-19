# 2026-09-19 — File hors-ligne : une seule source pour le vocabulaire d'actions (#726)

`shared/constants/offline_queue.ts` existe pour que le contrôleur et le composant
parlent du même identifiant d'action. Il n'en déclarait qu'une partie : quatre
identifiants restaient des **littéraux écrits à la main des deux côtés**
(`update-navigation-log`, `close-navigation-log`, `update-sheet-item`, et les
deux formes des incidents). Comme `drainQueue` rapproche un flash d'une action
enfilée par **égalité de chaînes**, renommer d'un seul côté laissait la
compilation et les deux moitiés de la suite de tests vertes, et cassait la
comparaison en production : l'action rejouée n'était ni résolue, ni signalée, ni
retirée de la file — elle restait en attente, sans que rien ne s'affiche.

- **Cause.** Le vocabulaire était dupliqué : chaque côté testé contre son propre
  littéral, sans rien pour rapprocher les deux. La garde d'hygiène de #696
  refermait le trou en relisant les sources, mais ne l'empêchait pas d'exister.
- **Correctif.** Tous les identifiants descendent dans
  `shared/constants/offline_queue.ts`, qui exporte en plus `OFFLINE_ACTION_TYPES`
  et l'union fermée `OfflineActionType`. Elle type le champ `type` d'une
  `QueuedAction` : un renommage casse maintenant à la compilation plutôt qu'en
  mer. Les deux côtés importent les constantes — `NavigationLogsController`
  (mise à jour et clôture), `BoatMaintenanceSheetItemsController`,
  `NavigationLogUpdateForm.vue`, `NavigationLogCloseForm.vue`,
  `BoatMaintenanceSheetItemList.vue` (clé de déduplication comprise),
  `BoatIncidentForm.vue`, et les trois cartes de `ConflictResolutionModal.vue`
  (`FIELDS_BY_TYPE`, `LABEL_PREFIX_BY_TYPE`, `DESCRIPTION_BY_TYPE`), désormais
  des `Partial<Record<OfflineActionType, …>>` à clés calculées.
  Les deux imports séparés du même module dans `NavigationLogEntriesController`
  sont fusionnés au passage.
- **Tests.** `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts` continue de
  **relire le disque** — une garde qui partagerait sa source avec sa cible
  hériterait de ses angles morts — et gagne deux vérifications : aucun
  identifiant n'est plus écrit en littéral (le contournement qui rouvrirait cette
  dette), et aucune constante déclarée n'est morte. La résolution lit désormais
  les constantes d'un ternaire (`editing ? UPDATE_… : CREATE_…`) et les clés
  calculées de `FIELDS_BY_TYPE`.
- **Libellés manquants.** La même garde vérifie maintenant que chaque identifiant
  déclaré a son libellé `common.offline.queue.type.<type>` dans les **deux**
  locales — `OfflinePendingQueue.vue` retombe silencieusement sur l'identifiant
  brut quand la clé manque. Deux manquaient depuis #481 : le panneau de la file
  affichait « create-navigation-log-entry » et « update-navigation-log-entry » au
  lieu de « Nouveau point de journal » et « Modification de point de journal ».
- **Constat au passage.** Rendre le vocabulaire clos a mis au jour un trou que le
  ternaire de `BoatIncidentForm.vue` cachait à la garde : les incidents sont
  enfilés hors-ligne alors que `BoatIncidentsController` rend ses refus métier en
  `flash('error')` + redirection, **sans `rejectedType`** — exactement le défaut
  que #727 a corrigé pour les quatre créations du domaine terrain. Le trou est
  laissé ouvert et **nommé** : deux exemptions motivées dans la garde, une ligne
  dans `docs/domain/offline-queue.md`.
