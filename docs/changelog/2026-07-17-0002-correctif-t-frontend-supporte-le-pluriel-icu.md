# 2026-07-17 — Correctif : `t()` frontend supporte le pluriel ICU (#360)

`inertia/composables/use_t.ts` ne faisait qu'une interpolation `{clé}` simple par regex — les clés au format ICU plural (`{count, plural, one {…} other {…}}`) s'affichaient brutes à l'écran (ex. onglet Logbook de la fiche bateau, clé `navigation_logs.count`).

- **Correctif** : `use_t.ts` détecte désormais les blocs `{var, plural, one {…} other {…}}`, sélectionne la branche via `Intl.PluralRules(locale).select(count)` (mêmes catégories que le backend) et remplace `#` par la valeur du compteur, avant l'interpolation classique des autres `{clé}`.
- **Tests** : `tests/inertia/use_t.spec.ts` couvre le singulier/pluriel en EN et FR, y compris le cas `count = 0` (catégorie CLDR `one` en français).
