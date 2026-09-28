# 2026-09-28 — Ordres de travail : correctifs de revue (#868)

Suite à l'ultrareview de la PR des ordres de travail.

## Désassignation d'un membre qui ne peut plus traiter ses tâches

- `OrganizationMemberService.removeMember()` et `updateRole()` (vers un rôle sans `maintenance.edit`, ex. `boat_owner`) remettent `assignee_id` / `assigned_at` à `NULL` sur les tâches **ouvertes** de ce membre dans les bateaux de l'organisation.
- Les tâches **terminées** gardent leur assigné (historique de qui a fait le travail) ; les tâches d'une autre organisation ne sont pas touchées.
- Effet : le scan quotidien ne notifie plus un ex-membre, et les rappels d'échéance proche repartent vers les admins.

## Planning : filtre « Assigné à » sur les tâches terminées

- `GET /planning` envoie désormais les 20 tâches terminées les plus récentes de la flotte **et** les 20 plus récentes de chaque assigné (`row_number() over (partition by assignee_id)`), au lieu du seul top 20 de la flotte.
- Nouvelle prop `doneTasksTotalByAssignee` (clé : id du membre ou `unassigned`) : le compteur de la colonne « Terminées » affiche le vrai total du filtre, plus la longueur de la liste tronquée.
- Constante partagée `PLANNING_DONE_TASKS_LIMIT` (`shared/types/planning.ts`).

## Durée estimée à 0

- La mise à jour d'une tâche conserve une durée estimée de `0` minute au lieu de la vider (`??` au lieu de `||`).
