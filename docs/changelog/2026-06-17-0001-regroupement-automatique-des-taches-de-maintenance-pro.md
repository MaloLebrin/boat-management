# 2026-06-17 — Regroupement automatique des tâches de maintenance — Pro & Enterprise #63

**Backend**

- `shared/types/plan.ts` — ajout de `canGroupTasks: boolean` dans `PlanQuotas` (false pour Starter, true pour Pro & Enterprise).
- `shared/types/planning.ts` — ajout de l'interface `TaskGroup` (`id`, `subject`, `boatId`, `boatName`, `tasks`, `earliestDueAt`, `latestDueAt`) et extension de `PlanningResult` avec `groups: TaskGroup[]` et `canGroupTasks: boolean`.
- `app/services/task_grouping_service.ts` — algorithme de clustering : regroupe les tâches par date (`kind === 'date'`, `status === 'open'`) qui partagent le même bateau et sujet, avec une fenêtre de proximité de 7 jours (balayage trié par `boatId → subject → dueAt`). Produit des groupes d'au moins 2 tâches.
- `app/services/planning_service.ts` — injection de `TaskGroupingService`, chargement de l'`Organization` pour lire le plan, calcul des groupes si `canGroupTasks`, exposition dans `PlanningResult`.
- `app/controllers/planning_controller.ts` — passage de `groups` et `canGroupTasks` à la vue Inertia.

**Frontend**

- Extraction de la page `planning/index.vue` (550 lignes → ~110 lignes) en 4 composants dédiés dans `inertia/components/planning/` :
  - `PlanningKanban.vue` — 4 colonnes Kanban avec support des groupes dans la colonne "Planifiées".
  - `PlanningCalendar.vue` — calendrier mensuel + agenda mobile + tâches sans date + tâches par heures.
  - `PlanningTaskCard.vue` — carte individuelle réutilisable (accent, badge, barré pour done).
  - `PlanningTaskGroup.vue` — carte pliable pour un groupe (sujet, plage de dates, bouton "Dissocier").
- `planning/index.vue` — toggle "Regroupement" (visible uniquement en Pro+), teaser upsell pour Starter, gestion des groupes dissociés en session (Set client-side).
- Comportement :
  - Le regroupement est activé par défaut et peut être désactivé via le toggle.
  - Les tâches groupées sont masquées des listes individuelles et affichées dans `PlanningTaskGroup`.
  - "Dissocier" retire le groupe de la vue pour la session courante.

**i18n** (FR + EN)

- `planning.grouping.toggle` — libellé du bouton toggle.
- `planning.grouping.toggleTitle` — title/tooltip du toggle.
- `planning.grouping.ungroup` — bouton de dissociation dans un groupe.
- `planning.grouping.proTeaser` — message d'incitation pour les plans Starter.

**Tests**

- `tests/unit/task_grouping_service.spec.ts` — 10 cas unitaires couvrant : entrée vide, tâche seule, regroupement dans la fenêtre, hors fenêtre (8 jours), sujets différents, bateaux différents, tâches par heures exclues, tâches done exclues, limite exacte de 7 jours, deux groupes indépendants.

---
