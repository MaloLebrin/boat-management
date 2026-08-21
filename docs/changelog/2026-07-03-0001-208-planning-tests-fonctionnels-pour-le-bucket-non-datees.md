# 2026-07-03 — [#208] Planning : tests fonctionnels pour le bucket "non datées"

**Complète la PR #243 (issue #209, duplicata de #208) qui ajoutait le bucket `undatedTasks`**

- `tests/functional/planning/index.spec.ts` : couverture de `GET /planning` — une tâche sans `dueAt` ni `dueEngineHours` atterrit dans `undatedTasks` et non dans `plannedTasks` ou `overdueTasks`
- Aucun changement de comportement : `app/services/planning_service.ts`, `inertia/pages/planning/index.vue` et les traductions `planning.json` étaient déjà en place depuis #243
