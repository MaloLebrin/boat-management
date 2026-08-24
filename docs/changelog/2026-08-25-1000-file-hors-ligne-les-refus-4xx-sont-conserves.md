# 2026-08-25 — File hors-ligne : une action refusée en 4xx n'est plus détruite (#487)

`drainQueue()` supprimait l'action de la file sur un refus serveur 4xx « pour ne pas bloquer la file » : un 422 de validation détruisait définitivement une saisie faite au large, avec un simple toast. À régler avant d'étendre la file aux 5 nouveaux formulaires du lot 3 (#488–#491).

- **Store `failed` (IndexedDB v2).** `fleetide-offline-queue` passe en version 2 avec un second store `failed` ; la montée de version **préserve la file existante** (le `upgrade` ne crée que les stores manquants — testé). Une action refusée en 4xx y est déplacée avec son payload, sa date d'échec et **les erreurs de validation renvoyées** par le serveur.
- **La file continue.** Après un refus, la synchronisation enchaîne sur l'action suivante — un échec ne bloque plus le reste. Les 5xx/erreurs réseau restent en file et sont rejoués, comme avant.
- **UI.** `OfflinePendingQueue.vue` affiche une section « actions en échec » distincte (tons `danger`), avec le motif (erreurs de validation) et deux actions explicites : **Réessayer** (remise en file + synchro) ou **Abandonner** — seule voie de suppression. `failedCount`/`failedActions` sont exposés par `useOfflineQueue` pour le layout.
- **i18n.** `offline.syncError` (« action ignorée », devenu faux) remplacé par `offline.syncRejected` ; 11 clés `offline.failed.*` ajoutées dans les deux locales.
- **Doc.** `docs/frontend/pwa.md` : architecture (store `failed`), tableau des exports, comportement de `drainQueue`, tableau « Comportements et limites », clés i18n.
- **Tests.** 9 cas Vitest ajoutés (32 verts sur les deux specs) : 422 → `failed` avec payload+erreurs, 500 → reste en file, file non bloquée par un échec, retry/abandon, migration v1→v2 sans perte, rendu de la section échecs.

Note de périmètre : l'issue évoquait « rouvrir le formulaire prérempli » ; cette v1 propose « Réessayer » (même payload) + motif affiché. Le préremplissage nécessite une coopération par formulaire — à câbler avec les formulaires du lot 3 (#488–#491), qui disposent désormais du payload conservé.
