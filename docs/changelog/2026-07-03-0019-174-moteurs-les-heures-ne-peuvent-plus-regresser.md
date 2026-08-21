# 2026-07-03 — [#174] Moteurs : les heures ne peuvent plus régresser

**Corrige B-05 : la mise à jour d'un moteur acceptait n'importe quelle valeur d'heures ≥ 0, sans vérifier qu'elle ne descend pas sous la valeur actuelle. Le compteur (monotone) pouvait donc régresser — manipulation frauduleuse, erreurs de maintenance préventive, biais des analyses IA**

- `app/exceptions/boat_errors.ts` : nouvelle erreur métier `EngineHoursRegressionError`
- `app/services/boat_engine_service.ts` : `update()` refuse une nouvelle valeur d'heures strictement inférieure à l'actuelle (`EngineHoursRegressionError`). Mettre la valeur à `null` (effacement) ou renseigner un moteur sans heures reste autorisé
- `app/controllers/boat_equipment_controller.ts` : `updateEngine()` attrape l'erreur → `session.flash('error', i18n.t('flash.engine.hoursRegression'))` + redirect
- `resources/lang/en/flash.json` et `fr/flash.json` : nouvelle clé `engine.hoursRegression`
- Tests ajoutés : `tests/functional/boats/engine_hours.spec.ts` (valeur inférieure rejetée et heures conservées ; valeur supérieure/égale acceptée ; passage depuis une valeur non renseignée autorisé)
