# 2026-07-01 — [#186] Maintenance : les items d'une fiche complétée sont désormais en lecture seule

**Correction de la mutabilité des fiches terminées**

- `app/exceptions/maintenance_errors.ts` : ajout de `BoatMaintenanceSheetValidationError` (avec `errorCode`)
- `app/services/boat_maintenance_sheet_service.ts` : `updateItem()` vérifie `sheet.status === 'completed'` et lève `BoatMaintenanceSheetValidationError('sheet is completed', 'sheetAlreadyCompleted')`
- `app/controllers/boat_maintenance_sheet_items_controller.ts` : capture `BoatMaintenanceSheetValidationError` et renvoie le message flash `flash.maintenanceSheets.${errorCode}`
- `resources/lang/{fr,en}/flash.json` : ajout de la clé `sheetAlreadyCompleted`
