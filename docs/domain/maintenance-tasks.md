# Domaine — Planned maintenance (tasks)

## Objectif fonctionnel

Planifier de la maintenance à faire (“open tasks”), puis:

- marquer une task comme faite
- supprimer une task
- gérer la **récurrence** (date ou heures moteur) via auto-création d’une task suivante

## Modèle de données

Référence: `database/schema.ts` (`BoatMaintenanceTaskSchema`).
Champs clés:

- `status`: `open | done`
- `due_at` (date) et/ou `due_engine_hours` (int)
- `done_at` (date), `done_engine_hours` (int) pour les tasks engine-hours
- `recurrence_interval_months` (int)
- `recurrence_interval_engine_hours` (int)
- cibles optionnelles: `boat_engine_id`, `boat_sail_id`, `boat_rig_id`

## Routes → controllers → services → UI

Références:

- routes: `start/routes/boats.ts`
- controller: `app/controllers/boat_maintenance_tasks_controller.ts`
- service: `app/services/boat_maintenance_task_service.ts`
- UI: `inertia/components/boats/show/tabs/BoatShowTabTasks.vue` (onglet « Tâches »), qui rend `inertia/components/boats/maintenance/BoatMaintenanceTasksPanel.vue`

### Créer une task

- `POST /boats/:boatId/maintenance-tasks` (`boats.maintenanceTasks.store`)
  - Controller: `BoatMaintenanceTasksController.store`
  - Validation: `createBoatMaintenanceTaskValidator`
  - ACL: `boatUpdate`
  - Service: `BoatMaintenanceTaskService.createForBoat`

Règles (source: `createForBoat`):

- `title` obligatoire (trim)
- au moins un des deux:
  - `dueAt`
  - `dueEngineHours`
- si `dueEngineHours` ou `recurrenceIntervalEngineHours` est défini:
  - `subject` doit être `engine`
  - `boatEngineId` est requis

### Marquer done

- `PUT /boats/:boatId/maintenance-tasks/:taskId/done` (`boats.maintenanceTasks.done`)
  - Controller: `BoatMaintenanceTasksController.markDone`
  - Validation: `markBoatMaintenanceTaskDoneValidator`
  - ACL: `boatUpdate`
  - Service: `BoatMaintenanceTaskService.markDone`

Règles (source: `markDone`):

- si task “engine-hour based” (dueEngineHours ou recurrenceIntervalEngineHours):
  - `doneEngineHours` requis, entier \(\ge 0\)
- met `status=done`, `doneAt`, et `doneEngineHours` (si applicable)
- si récurrence configurée, **auto-crée** la prochaine task:
  - date: `doneAt + recurrenceIntervalMonths`
  - heures: `doneEngineHours + recurrenceIntervalEngineHours`

### Supprimer une task

- `DELETE /boats/:boatId/maintenance-tasks/:taskId` (`boats.maintenanceTasks.destroy`)
  - Controller: `BoatMaintenanceTasksController.destroy`
  - Service: `BoatMaintenanceTaskService.deleteForBoat`

## Dashboard: “urgent maintenance”

La homepage connectée rend `inertia/pages/dashboard.vue` via `DashboardService.getForUser()`.
La logique “urgent”:

- tasks `open`
- une task est urgente si:
  - `dueAt` est dans \(\le\) `urgentWithinDays` (par défaut 14 jours)
  - ou si “engine-hours” avec `dueEngineHours - currentEngineHours <= urgentWithinEngineHours` (par défaut 10h)

Référence: `app/services/dashboard_service.ts`.
