# 2026-07-03 — [#205] Import CSV : nom de la pièce "Coût total" traduit (i18n)

**Corrige E-08 : `importMaintenanceRows()` créait la pièce de coût avec le libellé français `'Coût total'` codé en dur, quelle que soit la locale de l'utilisateur**

- `app/services/csv_import_service.ts` : `importMaintenanceRows()` prend désormais un paramètre `i18n: I18n` et utilise `i18n.t('maintenance.history.timeline.totalCost')` (clé déjà existante côté frontend) au lieu de la chaîne en dur
- `app/controllers/csv_import_controller.ts` : `confirm()` transmet `i18n` (déjà disponible dans le `HttpContext`) à `importMaintenanceRows()`
- Tests ajoutés : `tests/integration/services/csv_import_service.spec.ts` (le nom de la pièce reflète la locale `fr` et `en`)
