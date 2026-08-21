# 2026-07-01 — [#189] Budget : inclure les documents sans date d'émission (issued_at = null)

**Correction du calcul mensuel du budget qui ignorait silencieusement les documents sans date d'émission**

- `app/services/budget_service.ts` : `fetchDocumentsByMonth` utilise désormais `COALESCE(issued_at, created_at)` au lieu de `issued_at` seul — les documents sans date d'émission sont rattachés au mois de leur création plutôt qu'exclus du budget.
- `tests/functional/boats/budget.spec.ts` : test ajouté pour vérifier qu'un document avec `issued_at = null` et un coût est bien comptabilisé dans le budget annuel.
