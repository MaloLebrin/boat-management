# Planning de maintenance (`/planning`)

Vue flotte des tâches de maintenance : un **kanban** par échéance et un **calendrier** mensuel. Le regroupement des tâches (Pro+) est décrit dans [`task-grouping.md`](task-grouping.md).

## 1. Données

`PlanningController.index` → `PlanningService.getPlanningForOrg(user, { includeReservations })`.

| Prop                                                           | Contenu                                                                                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `tasks`                                                        | tâches ouvertes de la flotte                                                                                            |
| `overdueTasks` / `soonTasks` / `plannedTasks` / `undatedTasks` | colonnes du kanban : en retard, dues sous 30 jours (`PLANNING_SOON_DAYS`) ou sous 50 h moteur, plus tard, sans échéance |
| `doneTasks`, `doneTasksTotal`, `doneTasksTotalByAssignee`      | tâches terminées : top 20 de la flotte et de chaque assigné (#868)                                                      |
| `groups`, `canGroupTasks`                                      | regroupement (#693)                                                                                                     |
| `reservations`                                                 | réservations `option`/`confirmed` de J-31 à J+366 (#869)                                                                |
| `maintenanceAssignees`                                         | filtre « Assigné à » (#868)                                                                                             |

`reservations` est vide sans module Location (`QuotaService.canManageReservations`) **ou** sans `BoatPolicy.view`. Un mécanicien n'a pas `boats.view` : il ne les reçoit pas, et le lien d'une bande lui répondrait 403.

## 2. Glisser-déposer (#869)

- **Qui.** Capability `maintenance.edit`. Seules les tâches **ouvertes datées** se déplacent : une tâche en heures moteur n'a pas d'échéance calendaire.
- **Kanban.** Poignée ≥ 44 px sur la carte. On dépose sur une colonne (`shared/helpers/planning_schedule.ts` → `dueAtForColumn`) :
  - `soon` → dimanche de la semaine en cours ;
  - `planned` → +1 mois, au moins J+31 (sinon février retomberait en « Bientôt ») ;
  - `undated` → `null`.

  « En retard » et « Complétées » ne sont pas des cibles. Déposer dans sa propre colonne ne fait rien.

- **Calendrier.** On glisse une pastille sur un autre jour (grille desktop). Chaque case est une zone `day:YYYY-MM-DD`.
- **Envoi.** `router.patch('/boats/:boatId/maintenance-tasks/:taskId', { dueAt }, { preserveScroll, only: PLANNING_RELOAD_PROPS })`. La réponse est la redirection habituelle ; un report est compté et audité comme depuis le menu (#867).
- **Rendu optimiste.** `usePlanningReschedule` pose une échéance provisoire (`overrides`), que `applyDueAtOverrides` range comme le serveur. La fin de visite la retire : en cas de succès les props rechargées portent la même date, en cas d'échec la carte revient (rollback).
- **Pointer Events.** `usePointerDrag` retrouve la zone survolée par `elementFromPoint` sur `[data-drop-zone]`. Le seuil de 6 px sépare un clic d'un glisser. L'élément saisi a `pointer-events: none` pendant le geste. Échap annule.
- **Clavier.** Le menu « Reporter » de la carte reste l'alternative : le glisser n'est jamais le seul chemin.

## 3. Réservations et conflits

- **Bandes.** Dans le calendrier, les réservations se rendent en `AvailabilityBand` sous les tâches (confirmées en `mint`, options en `peach`), avec un lien vers `/boats/:id/reservations`. Le bouton « Réservations » de la barre d'outils masque la couche ; le filtre bateau s'y applique aussi.
- **Conflit.** `reservationConflictFor` cherche une réservation **confirmée** du même bateau qui chevauche les jours occupés par la tâche (échéance à minuit UTC, sur sa durée prévue, un jour par défaut, comme les fenêtres de #870).
  - La carte affiche « Pendant une location » et la pastille du calendrier est cerclée.
  - Un dépôt qui créerait le conflit ouvre une confirmation (`BaseConfirmModal`).
- **Côté serveur.** Rien n'empêche une tâche pendant une location : c'est la réservation confirmée qui est refusée sur un bateau indisponible (`BoatReservationService.assertBoatAvailable`, #870).

## 4. Couche « entretien planifié » de `/reservations`

`ReservationsController.index` ajoute à chaque `calendarEntries[]` une liste `maintenance: FleetMaintenanceWindow[]` (`PlanningService.maintenanceWindowsForBoats`) :

- ce sont les tâches ouvertes datées, de J-31 à J+366, en plages `[startsOn, endsOn[` ;
- elle n'est remplie que si `MaintenancePolicy.view` l'autorise.

`ReservationTimelineRow` les rend en liseré `AvailabilityBand kind="maintenance"` sous la location du jour, et la légende gagne « Entretien planifié ».

## 5. Tests

- `tests/inertia/planning_schedule.spec.ts`, `planning_drag_drop.spec.ts`, `reservation_timeline_row.spec.ts`
- `tests/functional/planning/reservations_overlay.spec.ts`
- `tests/browser/planning_drag_drop.spec.ts` (souris, Pointer Events tactiles)
