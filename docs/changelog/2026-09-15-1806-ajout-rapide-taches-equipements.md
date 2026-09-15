# 2026-09-15 — Ajout rapide de tâches sur les bateaux, moteurs et équipements

Jusqu'ici, une tâche de maintenance ne se créait que depuis la modale de l'onglet Tâches de la fiche bateau. Elle devait avoir une échéance (date ou heures moteur) et ne pouvait viser qu'un moteur, une voile ou le gréement. Noter « racheter une défense » ou « graisser le guindeau » demandait donc d'inventer une date et d'ouvrir le bon onglet. Désormais, une tâche s'ajoute en quelques secondes partout où l'on voit un équipement.

- **Échéance facultative.** `BoatMaintenanceTaskService.createForBoat` ne lève plus `dueRequired`. Une tâche sans date ni heures moteur est une simple chose à faire. Elle est rangée dans le groupe « Sans date » de l'onglet Tâches et du planning, et n'entre jamais dans les rappels, les notifications ni la liste urgente du dashboard (ces lecteurs filtraient déjà `due_at IS NOT NULL`, ce que des tests de non-régression verrouillent désormais). Le sujet devient lui aussi facultatif : il est déduit de l'équipement visé, sinon il vaut `boat`.
- **Tous les équipements.** Migration `1849000000000_alter_boat_maintenance_tasks_add_equipment_fks` : ajout de `boat_safety_equipment_id` et `boat_generic_equipment_id` (nullables, `SET NULL`, indexées, `down()` implémenté), avec les relations `safetyEquipment` / `genericEquipment` sur le modèle. Correspondance sujet ↔ équipement (`shared/helpers/maintenance_task_equipment.ts`) :

  | Équipement                         | Sujet        |
  | ---------------------------------- | ------------ |
  | moteur                             | `engine`     |
  | voile                              | `sail`       |
  | gréement                           | `rig`        |
  | sécurité                           | `safety`     |
  | générique `electrical` / `energy`  | `electrical` |
  | générique `plumbing`               | `plumbing`   |
  | générique `deck` / `anchoring`     | `deck`       |
  | générique `navigation` / `comfort` | `other`      |

  Un équipement générique accepte n'importe quel sujet ; un équipement dédié exige le sien.

- **Contrôles serveur.** Nouvelles erreurs `equipmentNotFound`, `multipleEquipment` et `subjectEquipmentMismatch` (flash en `fr` et `en`) :
  - au plus un équipement par tâche ;
  - l'équipement doit appartenir au bateau. Ce contrôle **corrige au passage une faille** : les ids moteur, voile et gréement n'étaient jusqu'ici jamais vérifiés.
  - `markDone` recopie les nouvelles FK sur l'occurrence récurrente.
  - Les listes trient les tâches datées avant les tâches sans date, de façon portable entre PostgreSQL et SQLite.
- **Retour à la page d'origine.** `BoatMaintenanceTasksController` (`store`, `markDone`, `destroy`) répond par `response.redirect().back()` au lieu de renvoyer systématiquement vers `/boats/:id`. L'audit de création porte `equipmentType` quand un équipement est visé.
- **Formulaire réutilisable.** `BoatMaintenanceTaskForm` ne dépend plus de `BoatShowDetail`.
  - Props : `boatId`, `equipment: TaskEquipmentSource`, `prefill`, `lockEquipment`.
  - Découpage :
    - `MaintenanceTaskSubjectFields.vue` : sujet et équipement (les 5 types). En mode verrouillé, une puce en lecture seule et des champs cachés.
    - composables `use_maintenance_task_form.ts` et `use_task_equipment_options.ts`.
  - `BoatMaintenanceTaskModal.vue` enveloppe le formulaire pour tous les points d'entrée. En mode verrouillé, une opération du catalogue ne change jamais le sujet.
- **Points d'entrée.**
  - **Onglet Tâches** : saisie rapide `MaintenanceTaskQuickAdd` (un titre puis Entrée). Les pastilles de filtre sont extraites dans `BoatTasksFilterPills.vue`. Le libellé d'une tâche affiche aussi le nom de son équipement de sécurité ou générique.
  - **Onglet Équipements** : bouton « Tâche » (`EquipmentAddTaskButton`) sur chaque moteur, voile, gréement, équipement de sécurité et équipement générique, quel que soit son statut, pour qui a `maintenance.create`. Il ouvre la modale avec l'équipement figé.
  - **Pages de détail** voile, gréement, sécurité et générique : nouvel onglet « Tâches » (`?tab=tasks`) avec `EquipmentTasksSection` (saisie rapide, formulaire complet, tâches ouvertes, tâches terminées repliées). Les contrôleurs exposent `maintenanceTasks`, `taskEquipment` et `taskPermissions`, calculés via `MaintenancePolicy` (`app/utils/maintenance_task_permissions.ts`).
  - **Page moteur** : bouton d'ajout et saisie rapide dans l'onglet Maintenance. La clôture passe par `BoatTaskActions`, ce qui **corrige** l'envoi manquant de `doneEngineHours` pour une tâche en heures moteur. Les droits suivent `MaintenancePolicy` et non plus `BoatPolicy.edit`.
  - **Dashboard** : bouton « + Tâche » (`QuickAddMaintenanceTaskModal`). Choisir le bateau déclenche un rechargement partiel de la prop optionnelle `taskEquipment` (`?taskBoatId=`), bornée à l'organisation. Nouvelle prop `canCreateMaintenanceTasks`.
- **Copilote.** Une proposition `create_task` sans échéance n'est plus dégradée en simple réponse : elle reste une action à confirmer. Les prompts FR et EN présentent l'échéance comme facultative. L'entrée `maintenance-tasks` de `product_knowledge.ts` décrit les tâches sans date, les équipements visés et les points d'entrée, avec de nouveaux mots-clés (`a faire`, `sans date`, `equipement`, `ajout rapide`).
- **Tests.**
  - Intégration du service (13 cas) : création sans échéance, sujet déduit, équipement d'un autre bateau refusé pour les 5 types, plusieurs FK refusées, sujet incohérent refusé, récurrence d'une tâche sans date, tri, `SET NULL`.
  - `tests/functional/maintenance/maintenance_tasks.spec.ts` (9 cas) : création avec le titre seul, retour à la page d'origine, mécanicien, équipement d'une autre organisation, droits, props des pages équipement et moteur.
  - `tests/functional/dashboard/quick_add_task.spec.ts` : rechargement partiel et cloisonnement par organisation.
  - Non-régression sur les notifications et le dashboard avec une tâche sans date.
  - Unitaires : helper de correspondance, parseur du copilote.
  - Vitest : formulaire verrouillé et pré-rempli, saisie rapide, section équipement, raccourcis des cartes, modale du dashboard, onglet Tâches.

**Limite connue.** Le dashboard mécanicien (`dashboard/mechanic`) n'a pas encore de bouton d'ajout rapide ; le mécanicien ajoute ses tâches depuis les fiches bateau et les pages d'équipement.
