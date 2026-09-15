# 2026-09-15 — L'échéance en heures moteur doit dépasser le compteur

Une tâche moteur pouvait avoir une échéance en heures égale ou inférieure au compteur actuel du moteur. Elle était alors en retard dès sa création. L'échéance en heures reste **facultative**, mais quand elle est renseignée, elle doit être **strictement supérieure** à `boat_engines.hours`. Un moteur sans compteur (`hours` à `null`) compte pour 0 h.

- **Service.** `BoatMaintenanceTaskService.createForBoat` lit maintenant le compteur du moteur visé : `findBoatEquipment` sélectionne `hours` en plus de l'id. Si `dueEngineHours <= hours`, le service lève `BoatMaintenanceTaskValidationError` avec le code `dueEngineHoursNotAboveCurrent`, et `details.currentHours` contient le compteur. `markDone` n'est pas concerné : l'occurrence suivante vaut toujours relevé + intervalle.
- **Erreur de champ.** Sur `POST /boats/:boatId/maintenance-tasks` (`BoatMaintenanceTasksController.store`), cette erreur ne passe pas par un flash global. Elle revient dans `inputErrorsBag.dueEngineHours`, avec la saisie conservée, et s'affiche sous le champ. Message : `validator.maintenanceTasks.dueEngineHoursNotAboveCurrent` (fr/en, avec le paramètre `{current}`).
- **Assistant IA.**
  - `AssistantActionsService.validateProposal` (`create_task`) applique la même règle. Une proposition dont l'échéance n'est pas au-dessus du compteur est rejetée (`AiInvalidResponseError`), et rien n'est persisté.
  - Le contrat `create_task` du prompt demande au modèle de vérifier le compteur avec `get_engine`.
- **Formulaire.** `TaskEquipmentSource.engines` expose `hours`, renseigné par `toTaskEquipmentSource`. Dans `MaintenanceTaskSubjectFields.vue`, le champ d'échéance en heures :
  - a pour `min` le compteur du moteur retenu + 1 (moteur choisi dans la liste ou verrouillé) ;
  - affiche l'aide « Compteur actuel : {hours} h ».
- **Libellés.** « Heures d'échéance » devient « Échéance (heures moteur, optionnel) », et « Récurrence (heures) » devient « Récurrence (heures moteur) ». La lecture « heure de la journée » n'est plus possible. Même changement côté `en`.
