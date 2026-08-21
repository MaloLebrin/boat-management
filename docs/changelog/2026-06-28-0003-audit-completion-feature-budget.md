# 2026-06-28 — Audit & complétion feature Budget

**Bugs corrigés**

- `budget.vue` : suppression du doublon `entries` dans le computed `categories` (7ème carte fantôme supprimée)
- `BoatPortStayService.listForBoat` : ajout du filtre `year` optionnel — la liste des séjours est maintenant cohérente avec l'année sélectionnée dans le sélecteur
- `BudgetCategoryCard.vue` : remplacement du `<button>` brut par `<BaseButton variant="ghost">` ; prop `unavailable` et clé `budget.portUnavailable` orphelines supprimées

**Architecture**

- `shared/types/budget.ts` : `BUDGET_ENTRY_CATEGORIES` et `BudgetEntryCategory` déplacés depuis `app/validators/` (conventions)
- `BoatBudgetEntryItem.amount` normalisé en `number` (était `string`, forçait un cast dans la vue)
- Nouveau `app/transformers/budget_transformer.ts` : `toBudgetEntryItem()` + `toPortStayItem()` — la mise en forme inline du `BudgetController.show` a été extraite

**Nouvelles fonctionnalités**

- `PATCH /boats/:id/budget/entries/:entryId` : édition d'une dépense libre (label, montant, date, catégorie, description)
- `PATCH /boats/:id/port-stays/:stayId` : édition d'un séjour au port
- `BudgetEntryList.vue` + `BudgetPortStayList.vue` : bouton « Modifier » avec formulaire inline (`useForm` → `form.patch`)
- Clés i18n ajoutées : `budget.portStay.editTitle/updateSubmit`, `budget.entries.editTitle/updateSubmit`, `flash.portStay.updated`, `flash.budgetEntry.updated` (FR + EN)

**Tests**

- Nouvelles factories : `BoatBudgetEntryFactory`, `BoatPortStayFactory`
- Tests fonctionnels PATCH pour entries et port stays (auth, isolation org, validation)
- Nouveaux tests Vitest : `BudgetBarChart`, `BudgetEntryForm`, `BudgetEntryList`, `BudgetPortStayForm`, `BudgetPortStayList`
