# 2026-06-25 — PWA : interface de résolution de conflits

Quand une action PATCH offline entre en conflit avec une version plus récente du serveur, une modale s'affiche pour laisser l'utilisateur choisir la version à conserver.

- `ConflictResolutionModal.vue` : modale avec tableau comparatif (vos modifications / version serveur), boutons « Garder mes modifications » / « Utiliser la version serveur »
- `use_offline_queue.ts` : `conflictedAction` (ref module) détectée dans `onSuccess` via `flash.conflictData` ; `resolveConflict('local'|'server')` re-enqueue avec le `updatedAt` serveur ou supprime l'action
- `NavigationLogConflictError` porte désormais un `ConflictLogSnapshot` (champs lisibles, sans modèle Lucid)
- Backend : flash `conflictData` (JSON) + `conflictType` au lieu d'un flash `error`, pour que la modale intercepte sans déclencher le toast générique
- `default.vue` : `<ConflictResolutionModal>` câblé ; `conflictedAction` et `resolveConflict` exposés
- i18n `offline.conflict.*` + `navigationLog.field.*` en FR et EN
- Tests : 3 nouveaux cas composable + 5 cas composant modal (175/175)
