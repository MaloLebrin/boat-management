# 2026-09-28 — Planning : glisser-déposer des tâches et réservations superposées

Issue #869. Le kanban et le calendrier de `/planning` étaient en lecture seule et ignoraient les réservations. Or pour un loueur, la seule question qui compte est « quand le bateau est-il libre pour l'entretien ? ». Aucune migration ni nouvelle route : le dépôt appelle la route d'update existante `PATCH /boats/:boatId/maintenance-tasks/:taskId`.

- **Kanban.**
  - Une carte datée se saisit par sa **poignée** (44 px, #494) et se dépose sur une colonne, qui lui donne son échéance :
    - « Bientôt dû » → fin de la semaine en cours ;
    - « Planifiées » → dans un mois, au moins au-delà du seuil de 30 jours ;
    - « Non datées » → plus d'échéance.
  - « En retard » et « Complétées » ne sont pas des cibles. Une tâche en heures moteur, une tâche terminée ou une tâche regroupée ne se déplacent pas.
- **Calendrier.** Une tâche se glisse sur un autre jour du mois (grille desktop).
- **Mécanique.**
  - Pointer Events (`usePointerDrag`), donc souris, stylet et doigt ; la poignée porte `touch-action: none` ; Échap annule.
  - Rendu **optimiste** : la carte change de colonne tout de suite, puis revient à sa place si la requête échoue.
  - Rechargement partiel des seules props du planning.
  - Le report reste compté et journalisé comme avant (#867).
  - Réservé à `maintenance.edit`. Le menu « Reporter » reste le chemin clavier.
- **Réservations dans le planning.**
  - Avec le module Location **et** le droit de voir les bateaux, `/planning` reçoit la prop `reservations` : options et confirmées, de J-31 à J+366.
  - Le calendrier les rend en **bandes** non déplaçables sous les tâches, avec un lien vers `/boats/:id/reservations`.
  - Un bouton « Réservations » masque la couche.
  - Un mécanicien ne les reçoit pas.
- **Conflit.**
  - Une tâche dont l'échéance (sur sa durée prévue) tombe pendant une réservation **confirmée** du même bateau est marquée « Pendant une location ».
  - Un dépôt qui créerait ce conflit demande confirmation. Le serveur ne bloque pas : c'est la réservation qui est refusée, pas la tâche (#870).
- **Filtre bateau** sur le planning, en plus du filtre « Assigné à ».
- **`/reservations`.** Chaque bateau de la frise porte `maintenance` : ses tâches ouvertes datées, en plages de jours. Elles sont rendues en liseré « Entretien planifié », avec une légende, pour qui a `maintenance.view`.
- **Composant commun.** `AvailabilityBand.vue` sert aux deux écrans.
- **Tests.**
  - Vitest : `planning_schedule` (échéances par colonne, conflits, rendu optimiste) et `planning_drag_drop` (glisser au pointeur, rollback, confirmation).
  - Fonctionnel : `planning/reservations_overlay`.
  - Navigateur : `planning_drag_drop`, à la souris et en Pointer Events tactiles.
