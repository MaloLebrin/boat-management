# 2026-07-21 — Pluralisation ICU des compteurs « (s) » et correction de « 1 bateaux » (#406)

Audit UX du 2026-07-19 : de nombreux compteurs affichaient le suffixe littéral `(s)`/`(x)` au lieu d'accorder correctement le texte (« 2 tâche(s) en retard », « 1 motorisé(s) », « 6 résultat(s) »…), et la liste des bateaux affichait toujours « bateaux » au pluriel même pour un seul résultat (« 1 bateaux »).

- Toutes les clés i18n concernées (`dashboard.json`, `boats.json`, `maintenance.json`, `settings.json`, `common.json`, `flash.json`, `reservations.json`, `notifications.json`, FR + EN) réécrites avec la syntaxe de pluralisation ICU déjà supportée par `useT()` (front) et `i18n.t()`/`formatMessage()` (back) : `{count, plural, one {…} other {…}}`. Les chaînes avec accord verbal (« sont en retard » → « est en retard » au singulier) sont également corrigées.
- `boats.json` (`list.boats`, « 1 bateaux ») : accepte désormais `{count}` et `BoatListToolbar.vue` passe le total à la traduction.
- `dashboard.vue` : bandeau d'alerte des tâches en retard restructuré en `flex gap-2` pour garantir l'espacement autour du tiret séparateur, quel que soit le rendu.
- Comportement inchangé pour `navigation_logs.count` (« 0 sortie ») : le singulier pour `count = 0` est la règle CLDR standard du français (`Intl.PluralRules('fr').select(0) === 'one'`), déjà couverte par `tests/inertia/use_t.spec.ts`.
- Tests : `tests/inertia/boat_list_toolbar.spec.ts` (le total est bien transmis comme `count`) ; suites fonctionnelles `notifications/scan`, `maintenance/history*` vérifiées (formatage ICU des messages backend inchangé).
