# 2026-07-16 — Suppression du code mort `BoatShowMaintenanceSection`

Le composant `inertia/components/boats/maintenance/BoatShowMaintenanceSection.vue` n'était plus rendu nulle part depuis le passage de la page bateau aux onglets (`BoatShowTabTasks.vue` / `BoatShowTabHistory.vue`), mais continuait d'être maintenu au fil des PR (dernière mise à jour lors de la PR #378 pour suivre la prop `createIntent`). Il violait par ailleurs la règle i18n (textes en dur « Maintenance », « Tasks », « Events » hors `t()`).

- **Supprimés** : `BoatShowMaintenanceSection.vue` et `BoatMaintenanceEventsPanel.vue` (ce dernier n'était importé que par le premier, donc mort par ricochet).
- **Conservés** : `BoatMaintenanceTasksPanel.vue` (toujours rendu par `BoatShowTabTasks.vue`) et `maintenance/utils.ts` (utilisé par les onglets et `BoatOverviewRecentActivity.vue`).
- **Docs mises à jour** : `docs/domain/boats.md`, `docs/domain/maintenance-tasks.md`, `docs/domain/maintenance-events.md` et `docs/frontend/ui-map.md` pointent désormais vers les composants d'onglets réellement rendus.
