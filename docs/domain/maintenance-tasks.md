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
- `postponed_count` (int, défaut 0) — nombre de reports de l'échéance (#867)
- ordre de travail (#868) : `assignee_id` (FK `users` nullable, `SET NULL`, indexée), `assigned_at`,
  `provider_name` (texte libre, 200), `estimated_cost` / `actual_cost` (decimal 10,2),
  `estimated_duration_minutes` / `actual_duration_minutes` (int)

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

### Modifier ou reporter une task (#867)

- `PATCH /boats/:boatId/maintenance-tasks/:taskId` (`boats.maintenanceTasks.update`)
  - Controller: `BoatMaintenanceTasksController.update`
  - Validation: `updateBoatMaintenanceTaskValidator`
  - ACL: `MaintenancePolicy.edit` (capability `maintenance.edit` — admin, member, mechanic ; comme « Marquer fait »)
  - Service: `BoatMaintenanceTaskService.updateForBoat`

Champs modifiables : `title`, `notes`, `dueAt`, `recurrenceIntervalMonths`, `dueEngineHours`,
`recurrenceIntervalEngineHours`. **Clé absente = champ inchangé**, valeur vide = champ vidé (le
bodyparser convertit `''` en `null`, d'où `nullable().optional()` dans le validateur).

Règles (source: `updateForBoat`):

- une task `done` est de l'historique : refus `taskDone` (flash d'erreur) ;
- le sujet et l'équipement visé ne se modifient pas — changer de cible, c'est une autre task ;
- heures moteur : mêmes règles qu'à la création (`subject=engine`, moteur rattaché, seuil
  strictement supérieur au compteur actuel → erreur de champ `dueEngineHours`) ;
- **report** : quand `dueAt` ou `dueEngineHours` recule, `postponed_count` est incrémenté. Retirer
  l'échéance ou l'avancer n'est pas un report ;
- **récurrence** : un nouvel intervalle ne touche que les occurrences à venir — la suivante est
  créée à la clôture avec l'intervalle en vigueur à ce moment-là, et repart à `postponed_count = 0` ;
- journal d'audit : `maintenance_task.postpone` quand seule l'échéance recule,
  `maintenance_task.update` sinon (métadonnées : `fields` modifiés, `postponedCount` si report).
  Une soumission sans changement n'écrit rien.

UI :

- `MaintenanceTaskPostponeMenu` — « Reporter » : +1 semaine, +1 mois (borné à la fin du mois) ou
  date libre. Le report part de l'échéance, ou d'aujourd'hui si elle est dépassée
  (`inertia/utils/task_postpone.ts`). Tâches datées uniquement ; une échéance en heures se décale
  depuis la modale.
- `BoatMaintenanceTaskEditModal` — formulaire complet ; champs heures moteur sur une tâche moteur seulement.
- Les deux vivent dans `BoatTaskActions` (onglet Tâches, carte urgente, sections équipement, onglet
  maintenance moteur) ; le menu « Reporter » est aussi sur `PlanningTaskCard`, qui affiche
  « Reportée N fois ».
- Hors-ligne : non couvert — la file hors-ligne (`docs/domain/offline-queue.md`) ne rejoue aucune
  mutation de task, clôture comprise.

### Ordres de travail : responsable, prestataire, prévu et réel (#868)

Une task se confie à un **membre** (`assigneeId`) ou à un **prestataire externe** (`providerName`,
champ libre en attendant un annuaire), avec un coût et une durée prévus.

- Saisie : à la création (`POST …/maintenance-tasks`) et à la modification (`PATCH …/:taskId`),
  mêmes clés `assigneeId`, `providerName`, `estimatedCost`, `estimatedDurationMinutes`. Composant
  `MaintenanceWorkOrderFields` dans `BoatMaintenanceTaskForm` et `BoatMaintenanceTaskEditModal`.
- Assignable : membre de l'organisation **dont le rôle a `maintenance.edit`** (admin, member,
  mechanic). Un propriétaire de bateau ou un utilisateur d'une autre organisation est refusé
  (`flash.maintenanceTasks.assigneeNotMember`). Liste : `BoatMaintenanceTaskService.listAssignees`,
  exposée en prop `maintenanceAssignees` par la fiche bateau (différée, groupe `maintenance`) et le
  planning ; lue par `useMaintenanceAssignees()`. Sur les autres pages, pas de sélecteur.
- Coût : `min(0)`, deux décimales au plus. Durée en minutes, plafonnée à 100 000.
- Changement de responsable : `assigned_at` = maintenant (ou `null` à la désassignation), ligne
  d'audit **`maintenance_task.assign`** (métadonnée `assigneeId`, `null` pour une désassignation) ;
  la ligne `update` ne couvre que les autres champs. Événement `MaintenanceTaskAssigned` → listener
  `on_maintenance_task_assigned` → notification **`maintenance.assigned`** (in-app + push, lien
  `/planning?task=<id>`) à l'assigné, sauf s'il se l'est confiée lui-même.
- Clôture : `PUT …/done` accepte `actualCost` et `actualDurationMinutes`. `BoatTaskActions` ne les
  demande que si la task a une estimation. L'occurrence suivante d'une récurrence reprend
  responsable, prestataire et estimations, jamais le réel.
- Scan quotidien (`NotificationScanService`) : une échéance proche **assignée** va à l'assigné
  seul, lien `/planning` (un mécanicien n'a pas `boats.view`) ; non assignée, aux admins. Un retard
  va aux admins **et** à l'assigné. Un même utilisateur ne reçoit qu'une notification par bateau et
  par type.
- Planning : pastille d'initiales de l'assigné et prestataire sur `PlanningTaskCard`, filtre
  « Assigné à » (toutes, les miennes, non assignées, un membre — `inertia/utils/task_assignee_filter.ts`).
  Un mécanicien à qui des tâches sont confiées arrive sur « Mes tâches ».
- Tableau de bord mécanicien : bascule « Mes tâches / Toute la flotte », sur « Mes tâches » dès
  qu'une tâche lui est confiée. Widget « Tâches planifiées » : liste `mine` calculée côté serveur,
  bascule « Les miennes / Toutes » quand elle n'est pas vide.
- Budget prévisionnel : `BudgetService.getPlannedMaintenance` — somme des `estimated_cost` des
  tasks ouvertes datées jusqu'à la fin du trimestre civil (retards compris), et nombre de tasks
  sans estimation. Carte sur `/boats/:id/budget`, ligne sous la carte « Dépenses » du tableau de bord.
- Export : `GET /boats/:id/export/maintenance-tasks.csv` (`boats.export.maintenanceTasks`), une
  ligne par task avec responsable, prestataire, prévu et réel ; lien dans Paramètres → Import/Export.
- Assistant : le digest planning (`AssistantContextService.buildFleetDigestLines`) nomme le
  responsable de chaque task et liste celles confiées à l'utilisateur qui pose la question.

Hors périmètre : un annuaire de prestataires (table dédiée), l'e-mail d'assignation (attend les
préférences de notification, #888), le report du prévu/réel sur `boat_maintenance_events` — la
clôture d'une task ne crée pas d'événement d'historique.

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
  `whereIn('boatId', …)` sur les tâches. Depuis #845, `/planning` redirige un `boat_owner` vers
  `/owner/boats` puis exige `MaintenancePolicy.view` (capability `maintenance.view`, sans bateau) :
  un mécanicien y accède alors que `/boats/:id` lui répond 403, et le filtrage fin des actions
  reste laissé à l'UI via les capabilities.

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
