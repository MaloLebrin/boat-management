# 2026-07-04 — [#185] Fiches de maintenance : impossible de terminer une fiche avec des items non cochés

**Corrige E-04 : `completeSheet()` passait la fiche en statut `completed` sans charger les items ni vérifier qu'ils étaient tous cochés. Une fiche avec des items non faits pouvait être marquée « terminée », compromettant l'intégrité des données**

- `app/exceptions/maintenance_errors.ts` : nouvelle erreur métier `BoatMaintenanceSheetIncompleteError`
- `app/services/boat_maintenance_sheet_service.ts` (`completeSheet`) : précharge les items et lève `BoatMaintenanceSheetIncompleteError` si au moins un item a `isDone = false`. Une fiche sans item reste complétable (rien à cocher)
- `app/controllers/boat_maintenance_sheets_controller.ts` : `complete()` attrape l'erreur → `flash.maintenanceSheets.itemsNotDone`
- `resources/lang/en/flash.json` et `fr` : nouvelle clé `maintenanceSheets.itemsNotDone`
- Tests ajoutés : `tests/functional/boats/maintenance_sheets.spec.ts` (fiche avec un item non coché → refus + flash, statut inchangé ; tous cochés → complétée ; fiche sans item → complétée)
