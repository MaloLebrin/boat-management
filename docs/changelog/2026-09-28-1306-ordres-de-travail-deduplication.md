# 2026-09-28 — Ordres de travail : suppression de trois duplications (#868)

Nettoyage relevé en revue de la PR des ordres de travail (#911). Aucun changement de comportement, aucune route ni migration.

## Lecture des colonnes `decimal`

- Nouveau helper partagé `decimalColumnToNumber()` dans `shared/helpers/number_format.ts` : lit une colonne `decimal` nullable (chaîne renvoyée par Lucid/PostgreSQL, ou nombre) et renvoie `null` si elle est vide ou ne se lit pas comme un nombre fini.
- Il remplace `decimal()` de `app/transformers/maintenance_transformer.ts` (coûts prévu/réel de l'ordre de travail) et `decimalOrNull()` de `app/services/boat_maintenance_task_service.ts` (détection d'un changement de coût estimé).

## Composable `useCurrentUser`

- `inertia/composables/use_current_user.ts` expose `currentUserId` (id de la prop partagée `user`, `null` hors session).
- Utilisé par `inertia/pages/planning/index.vue` et `inertia/pages/dashboard/mechanic.vue`, qui recalculaient chacun ce `computed`.

## Composable `useMineAllScope`

- `inertia/composables/use_mine_all_scope.ts` porte la bascule « mes tâches / toutes » : `scope`, `scopeOptions` (libellés depuis les clés i18n passées en paramètre) et `setScope()` qui ramène toute valeur autre que `'mine'` à `'all'`.
- La valeur initiale peut être réactive : `DashboardPlannedTasksCard` s'ouvre sur « mes tâches » quand la prop différée arrive avec des tâches assignées, comme avant avec son `watch`.
- Utilisé par `inertia/components/dashboard/DashboardPlannedTasksCard.vue` et `inertia/pages/dashboard/mechanic.vue`.

## Tests

- `tests/unit/helpers/number_format.spec.ts` : cas de `decimalColumnToNumber`.
- `tests/inertia/use_current_user.spec.ts` et `tests/inertia/use_mine_all_scope.spec.ts`.
