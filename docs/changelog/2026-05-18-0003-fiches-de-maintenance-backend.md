# 2026-05-18

## Fiches de maintenance — Backend

Backend complet pour les fiches de maintenance avec checklist pré-remplie :

- **Types de fiches** : entretien (10 items), montage (10 items), hivernage (14 items), déshivernage (14 items), atelier (8 items)
- **Modèles** : `BoatMaintenanceSheet` et `BoatMaintenanceSheetItem` avec relations Lucid
- **Service** : `BoatMaintenanceSheetService` (list, create, complete, delete, updateItem)
- **Service de templates** : `BoatMaintenanceSheetTemplateService` retourne les items par défaut selon le type
- **Controllers** : `BoatMaintenanceSheetsController` (store, complete, destroy) et `BoatMaintenanceSheetItemsController` (update)
- **Validator** : `createBoatMaintenanceSheetValidator` et `updateSheetItemValidator`
- **Routes** :
  - `POST /boats/:boatId/maintenance-sheets` — créer une fiche
  - `PUT /boats/:boatId/maintenance-sheets/:sheetId/complete` — marquer complète
  - `DELETE /boats/:boatId/maintenance-sheets/:sheetId` — supprimer
  - `PUT /boats/:boatId/maintenance-sheets/:sheetId/items/:itemId` — mettre à jour un item
- **Données exposées** dans `BoatsController.show` via `maintenanceSheets`

---
