# 2026-06-25 — Aide contextuelle budget (tooltips sources de données)

Ajout de tooltips sur chaque carte de catégorie du tableau de bord budget pour expliquer d'où viennent les chiffres.

- Prop `helpText` ajoutée sur `BudgetCategoryCard.vue` : affiche une icône `?` avec tooltip au survol
- Page `budget.vue` : chaque `BudgetCategoryCard` reçoit la clé i18n `budget.help.<categorie>` en `helpText`
- i18n : clés `budget.help.maintenance`, `.fuel`, `.documents`, `.port`, `.equipment`, `.entries`, `.total` en FR et EN

Ajout de la possibilite de saisir des depenses libres (taxe de francisation, cotisation club, etc.) dans le module budget.

- Table `boat_budget_entries` : `amount`, `date`, `label`, `category` (maintenance/fuel/documents/port/equipment/other), `description`
- Modele `BoatBudgetEntry` avec relation `belongsTo` vers `Boat`
- Service `BoatBudgetEntryService` : `listForBoat`, `create`, `delete`
- Controller `BoatBudgetEntryController` : `store`, `destroy`
- Routes : `POST /boats/:id/budget/entries`, `DELETE /boats/:id/budget/entries/:entryId`
- `BudgetService` : nouvelle methode `fetchEntriesByMonth` ; `entries` ajoute a `BudgetMonthlyData` et `BudgetYearSummary`
- Export CSV budget : colonne `entries` (depenses_libres) ajoutee
- Frontend : `BudgetEntryForm.vue` (formulaire avec selection de categorie), `BudgetEntryList.vue` (liste avec badges couleur par categorie)
- Page budget : categorie Depenses libres active en orange, grille 6 colonnes
- Graphique mensuel : dataset Depenses libres en orange
- i18n : cles `budget.entries.*`, `budget.categories.entries`, `budget.csv.headers.entries` et `flash.budgetEntry.*` en FR et EN
- Tests : `budget_entries.spec.ts` (creation, suppression, validation, securite)
