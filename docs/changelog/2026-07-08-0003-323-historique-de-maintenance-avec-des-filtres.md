# 2026-07-08 — [#323] Historique de maintenance avec des filtres

Refonte de la page `/maintenance/history` : le filtrage et la pagination passent **côté serveur** (pattern org-scopé de `boats`/`clients`), et de nouveaux filtres sont ajoutés.

- **Filtres** : recherche texte (titre **ou** nom de bateau), **bateau**, **sujet**, **plage de dates** (`performedAt` de/à), tri **plus récent / plus ancien**, avec **pagination**.
- **Query params** de `GET /maintenance/history` : `q`, `subject`, `boatId`, `dateFrom`, `dateTo`, `sort` (`recent`|`oldest`), `page`, `perPage`. Normalisés via `shared/helpers/query.ts` (échappement `LIKE`, clamp pagination, validation des dates `yyyy-MM-dd`, `boatId` hors org ignoré).
- **Service** : `BoatMaintenanceService.getHistoryForOrg(user, query)` renvoie désormais `{ events: { data, meta }, stats, filters, boatOptions }`. Les **stats** (événements, pièces, bateaux, coût total) sont calculées sur **l'ensemble filtré complet**, pas seulement la page courante.
- **Types partagés** : `MaintenanceHistoryFilters`, `MaintenanceHistorySort`, `MaintenanceHistoryStats`, `MaintenanceBoatOption`, `MaintenanceHistoryPaginated` dans `shared/types/maintenance.ts`.
- **Frontend** : `inertia/pages/maintenance/history.vue` (orchestrateur) + nouveaux composants `MaintenanceHistoryToolbar.vue` (barre de filtres, recherche debounced) et `MaintenanceHistoryTimeline.vue` (timeline groupée par mois), navigation via `router.get`.
- **i18n** : bloc `maintenance.history.filterBar.*` (en + fr).
