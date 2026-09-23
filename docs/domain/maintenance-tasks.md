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
- cibles optionnelles: `boat_engine_id`, `boat_sail_id`, `boat_rig_id`, `boat_safety_equipment_id`, `boat_generic_equipment_id`
- `boat_incident_id` (FK nullable, `SET NULL`) — incident à l'origine de la tâche (#815), voir `docs/domain/incidents.md`

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
- `boatIncidentId` facultatif : doit être un incident **du bateau** (`incidentNotFound` sinon) ; posé en champ caché par « Créer une tâche » depuis un incident (#815) et repris dans les métadonnées d'audit (`incidentId`). Le clone récurrent créé par `markDone` ne le reporte pas.
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

## Planning: les cinq seaux

`/planning` est l'écran de pilotage quotidien. `PlanningService.getPlanningForOrg()` ventile les
tâches de l'organisation en cinq listes, **entièrement en mémoire** (Luxon), à partir de
`DateTime.now().startOf('day')`.

| Seau      | Règle                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------- |
| `undated` | `dueAt` **et** `dueEngineHours` tous deux nuls — un **ET**, pas un OU                              |
| `overdue` | tâche datée dont `dueAt < aujourd'hui`, ou tâche horaire dont `heures courantes >= dueEngineHours` |
| `soon`    | tâche datée due dans **0 à 30 jours inclus**, ou tâche horaire à **1 à 50 heures** du terme        |
| `planned` | tout le reste : ni en retard, ni bientôt dû                                                        |
| `done`    | `status = 'done'` — requête SQL **séparée**, donc jamais en double avec les autres                 |

Quatre points qui ne se devinent pas :

- **`kind` est décidé par `dueEngineHours !== null`.** Une tâche portant les deux échéances est
  classée sur les **heures** ; son `dueAt` est ignoré par le classement.
- **Une tâche horaire sans `boatEngineId` résolu** (ou dont le moteur est introuvable) a
  `currentEngineHours = null` : les deux prédicats renvoient `false` et elle atterrit en `planned`,
  **quel que soit son retard**. Elle devient donc invisible du pilotage. Comportement constaté,
  figé par `tests/functional/planning/buckets.spec.ts`.
- **`doneTasks` est plafonné à 20** (tri `updatedAt` décroissant) ; `doneTasksTotal` porte le total
  réel.
- **L'isolation ne tient qu'au `where('organizationId', …)` sur les bateaux**, puis au
  `whereIn('boatId', …)` sur les tâches. Il n'y a **aucun bouncer** sur `/planning` : un mécanicien y
  accède alors que `/boats/:id` lui répond 403, et le filtrage fin est laissé à l'UI via les
  capabilities.

`countDueTasksForOrg()` réutilise les **mêmes** prédicats pour ne renvoyer que `{ overdue, soon }`.
Elle n'alimente **aucun badge de navigation** : son unique appelant est `AssistantStarterService`,
pour les suggestions de démarrage du copilote.

⚠️ **Ne pas confondre avec les seuils du dashboard ci-dessous** (14 jours / 10 heures) : ce sont deux
fonctionnalités distinctes, avec des seuils différents.

Référence : `app/services/planning_service.ts`. Le regroupement des tâches `planned` réservé au plan
Pro est documenté à part dans `docs/domain/task-grouping.md`.

## Dashboard: “urgent maintenance”

La homepage connectée rend `inertia/pages/dashboard.vue` via `DashboardService.getForUser()`.
La logique “urgent”:

- tasks `open`
- une task est urgente si:
  - `dueAt` est dans \(\le\) `urgentWithinDays` (par défaut 14 jours)
  - ou si “engine-hours” avec `dueEngineHours - currentEngineHours <= urgentWithinEngineHours` (par défaut 10h)

Référence: `app/services/dashboard_service.ts`.
