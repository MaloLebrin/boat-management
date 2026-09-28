# 2026-09-28 — Modifier et reporter une tâche planifiée

Issue #867. Une tâche planifiée se créait, se clôturait et se supprimait, mais ne se modifiait pas. Corriger une faute dans le titre ou décaler une échéance obligeait à supprimer puis recréer la tâche. Le « report en un clic » promis par le marketing n'existait pas.

- **Route.** `PATCH /boats/:boatId/maintenance-tasks/:taskId` (`boats.maintenanceTasks.update`) :
  - protégée par `MaintenancePolicy.edit` (capability `maintenance.edit`, comme « Marquer fait ») : admin, member et mechanic peuvent modifier, le propriétaire ne peut pas ;
  - validée par `updateBoatMaintenanceTaskValidator` : une clé absente laisse le champ intact, une valeur vide le vide ;
  - traitée par `BoatMaintenanceTaskService.updateForBoat`.
- **Règles.**
  - Une tâche terminée est refusée (`flash.maintenanceTasks.taskDone`) : elle fait partie de l'historique.
  - Le sujet et l'équipement visé ne se modifient pas.
  - Les heures moteur suivent les mêmes règles qu'à la création.
  - Un nouvel intervalle de récurrence ne s'applique qu'aux occurrences créées après la clôture de la tâche en cours.
- **Report.**
  - Nouvelle colonne `postponed_count` (migration `1863000000000`). Elle est incrémentée quand la date ou le seuil d'heures recule, et exposée dans `MaintenanceTaskRow` et `PlanningTask`.
  - Journal d'audit : `maintenance_task.postpone` quand seule l'échéance recule, `maintenance_task.update` sinon. Une soumission sans changement n'écrit rien.
  - Les deux actions ont leur libellé dans l'onglet Journal d'activité.
- **UI.**
  - Menu « Reporter » (`MaintenanceTaskPostponeMenu`) : +1 semaine, +1 mois (borné à la fin du mois) ou date libre, envoyé avec `router.patch` et `preserveScroll`. Le report part de l'échéance, ou d'aujourd'hui si elle est dépassée.
  - Modale « Modifier » (`BoatMaintenanceTaskEditModal`).
  - Les deux sont dans `BoatTaskActions` : onglet Tâches, carte urgente, sections équipement, onglet maintenance du moteur.
  - Le menu est aussi sur `PlanningTaskCard`, qui affiche « Reportée N fois ».
- **Hors périmètre.**
  - Hors-ligne : la file ne rejoue aucune mutation de tâche, pas même la clôture, contrairement à ce que supposait l'issue.
  - Glisser-déposer du planning (#869) : il appellera cette même route.
- **Tests.**
  - `tests/functional/maintenance/maintenance_task_update.spec.ts` (14 cas) : champs, vidage, report et audit, tâche close, rôles, cross-org, heures moteur, récurrence.
  - `tests/inertia/task_postpone.spec.ts` : calcul des dates.
  - `tests/inertia/maintenance_task_edit_postpone.spec.ts` : menu, modale, `BoatTaskActions`, carte du planning.
- **Docs.** `docs/domain/maintenance-tasks.md`, entrée `maintenance-task-edit-postpone` dans `product_knowledge.ts`.
