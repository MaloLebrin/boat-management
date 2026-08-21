# 2026-07-01 — [#190] Budget : autoriser les montants négatifs (avoirs, remboursements)

**Correction du validateur qui rejetait les montants négatifs dans les entrées budgétaires**

- `app/validators/budget_entry_validator.ts` : suppression de `.positive()` sur `amount` — seul `.decimal([0, 2])` est conservé, permettant les montants négatifs (avoirs, remboursements assurance, ajustements).
- `inertia/components/boats/budget/BudgetEntryForm.vue` : suppression de `min="0"` sur le champ montant pour cohérence avec la validation backend.
- La colonne DB `decimal(10, 2)` supporte nativement les négatifs — aucune migration nécessaire.
- Le `SUM(amount)` dans `budget_service.ts` impute naturellement les crédits en réduction du total.
- `tests/functional/boats/budget_entries.spec.ts` : 2 nouveaux tests (POST et PATCH avec montants négatifs).
