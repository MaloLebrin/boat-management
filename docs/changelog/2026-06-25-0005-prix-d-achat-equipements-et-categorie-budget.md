# 2026-06-25 — Prix d'achat equipements et categorie budget

Ajout des champs `purchase_price` et `purchased_at` sur les 4 modeles d'equipements, avec integration dans le tableau de bord budget annuel.

- 4 migrations : alter `boat_generic_equipment`, `boat_safety_equipment`, `boat_sails`, `boat_engine_parts` pour ajouter `purchase_price` (decimal 10,2) et `purchased_at` (date)
- Validators : champs ajoutes dans `createGenericEquipmentValidator`, `updateGenericEquipmentValidator`, `createSafetyEquipmentValidator`, `updateSafetyEquipmentValidator`, `sailPayload`, `partFields`
- Services : mapping des nouveaux champs dans `BoatGenericEquipmentService`, `BoatSafetyEquipmentService`, `BoatSailService`, `BoatEnginePartService`
- Types : `purchasePrice` et `purchasedAt` ajoutes dans `BoatGenericEquipmentPayload`, `BoatSafetyEquipmentPayload`, `BoatSailPayload`, `BoatEnginePartPayload` (`shared/types/boat.ts`)
- `BudgetMonthlyData` et `BudgetYearSummary` : nouveau champ `equipment`
- `BudgetService.fetchEquipmentByMonth` : agregation sur les 4 tables (avec jointure `boat_engines` pour `boat_engine_parts`)
- Export CSV budget : colonne `equipment` ajoutee
- Frontend : champs prix/date dans `BoatGenericEquipmentFields.vue`, `BoatSafetyEquipmentFields.vue`, `BoatEquipmentSailFields.vue`, `EnginePartModal.vue`
- Page budget : categorie Equipements en couleur verte, grille 5 colonnes
- Graphique mensuel : dataset Equipment en vert
- i18n : `budget.categories.equipment`, `budget.csv.headers.equipment`, `equipment.purchasePrice.label`, `equipment.purchasedAt.label` en FR et EN
- Tests : `budget_equipment.spec.ts` (integration equipements dans budget)
