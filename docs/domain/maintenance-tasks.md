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
- UI: `inertia/components/boats/show/tabs/BoatShowTabTasks.vue` (onglet « Tâches »), qui rend `inertia/components/boats/maintenance/BoatMaintenanceTasksPanel.vue`, lui-même délégant le formulaire de création à `BoatMaintenanceTaskForm.vue`

### Créer une task

- `POST /boats/:boatId/maintenance-tasks` (`boats.maintenanceTasks.store`)
  - Controller: `BoatMaintenanceTasksController.store`
  - Validation: `createBoatMaintenanceTaskValidator`
  - ACL: `boatUpdate`
  - Service: `BoatMaintenanceTaskService.createForBoat`

Règles (source: `createForBoat`):

- `title` obligatoire (trim), 200 caractères max — aligné sur les événements (#581)
- `subject` : les 10 valeurs de `MAINTENANCE_SUBJECTS` (`shared/constants/maintenance/maintenance_subjects.ts`), source unique partagée avec les événements et l'historique
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

## Catalogue d'opérations standard (#581)

Le titre de la tâche est une **combobox** (`BaseCombobox`) alimentée par
`shared/constants/maintenance/maintenance_operations.ts` : ~95 opérations
nommées réparties sur les 10 sujets, avec des périodicités **indicatives**
(`defaultIntervalMonths`, `defaultIntervalEngineHours`).

- retenir une opération remplit le titre, aligne le `subject` et **complète les
  intervalles de récurrence encore vides** — une valeur déjà saisie n'est jamais
  écrasée (`prefillInterval`) ;
- la **saisie libre reste acceptée telle quelle** : le catalogue assiste, il ne
  contraint pas, et rien n'est persisté d'autre que le titre ;
- les opérations moteur portent des `families` et sont écartées quand elles sont
  incohérentes avec les moteurs du bateau (pas de « bougies » sur un diesel). La
  famille est dérivée du couple `kind` / `fuel` par `resolveEngineFamily()`
  (`shared/helpers/maintenance_operations.ts`) — repli assumé tant que
  `ENGINE_FAMILIES` (#574) n'est pas livré ; un couple qui ne tranche pas ne
  filtre rien.

Le corpus est une **constante partagée**, pas une API : aucun `fetch` ni route
dédiée. Composable côté Inertia : `inertia/composables/use_maintenance_operations.ts`.

Les clés `key` sont **stables à vie** (elles préfixent les clés i18n
`maintenance.operations.<key>.label` / `.note`, présentes dans les deux locales).
Elles ne sont pas encore persistées : `operation_key` sur les tâches et les
événements reste une extension v2, nécessaire aux statistiques par opération.

## Dashboard: “urgent maintenance”

La homepage connectée rend `inertia/pages/dashboard.vue` via `DashboardService.getForUser()`.
La logique “urgent”:

- tasks `open`
- une task est urgente si:
  - `dueAt` est dans \(\le\) `urgentWithinDays` (par défaut 14 jours)
  - ou si “engine-hours” avec `dueEngineHours - currentEngineHours <= urgentWithinEngineHours` (par défaut 10h)

Référence: `app/services/dashboard_service.ts`.
