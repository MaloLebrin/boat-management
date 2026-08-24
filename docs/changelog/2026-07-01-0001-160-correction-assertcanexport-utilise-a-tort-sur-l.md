# 2026-07-01 — [#160] Correction : assertCanExport utilisé à tort sur l'endpoint d'import CSV

**Bug de contrôle d'accès corrigé**

- `app/controllers/csv_import_controller.ts` — `preview()` appelait `this.quotaService.assertCanExport(user.organization)` alors qu'il s'agit d'un endpoint d'**import** CSV. Résultat : tous les utilisateurs sur le plan `starter` (sans accès export) ne pouvaient pas importer, alors que l'import est une feature sans restriction de plan.
- Correction : suppression de la gate `assertCanExport` (et du `user.load('organization')` devenu inutile), l'import CSV est désormais accessible à tous les plans.
- Nettoyage : `QuotaService` retiré du constructeur puisqu'il n'est plus utilisé.
- 4 tests fonctionnels ajoutés dans `tests/functional/settings/csv_import.spec.ts` (plan starter, plan pro, non authentifié, bateau inconnu).
- Route concernée : `POST /settings/import/preview`
