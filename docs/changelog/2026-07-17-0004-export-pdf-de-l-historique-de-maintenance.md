# 2026-07-17 — Export PDF de l'historique de maintenance (#362)

Le bouton « Export PDF » de l'historique de maintenance ne faisait rien (deux `TODO` non implémentés) — ni sur `/maintenance/history`, ni sur l'onglet History de la fiche bateau.

- **Fiche bateau** (`BoatShowTabHistory.vue`) : le bouton pointe désormais vers la route existante `GET /boats/:id/maintenance-log.pdf` (mutualisation avec le carnet d'entretien déjà téléchargeable depuis l'en-tête de la fiche bateau) — aucune nouvelle route backend nécessaire ici.
- **Historique global** (`/maintenance/history`) : nouvelle route `GET /maintenance/history.pdf` qui reprend les filtres courants (`q`, `subject`, `boatId`, `dateFrom`, `dateTo`, `sort`) en query params et génère un PDF listant l'intégralité des événements filtrés (pas seulement la page affichée) — `MaintenanceHistoryPdfService` + `MaintenanceHistoryPdfController`.
- Les deux routes sont soumises au même quota `canExport` (plan Pro/Entreprise) que le carnet d'entretien ; les boutons sont masqués côté front quand le quota ne l'autorise pas, et le backend redirige avec un flash d'erreur en cas de contournement direct de l'URL.
- `BoatMaintenanceService.getHistoryForOrg` a été refactoré pour extraire la construction de la requête filtrée (`#buildFilteredHistoryQuery`), réutilisée par la nouvelle méthode `getHistoryEventsForPdf` (export complet, non paginé).
- **Tests** : `tests/functional/maintenance/history_pdf.spec.ts`, `tests/functional/maintenance/history.spec.ts` (prop `canExport`), `tests/inertia/boat_show_tab_history_export.spec.ts`, `tests/inertia/maintenance_history_export.spec.ts`.
