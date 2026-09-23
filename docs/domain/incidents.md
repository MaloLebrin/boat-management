# Domaine — Incidents

## Objectif fonctionnel

Déclarer et suivre les événements imprévus d'un bateau (#106) : échouage, voie d'eau, casse voilure/gréement, avarie moteur, collision, incendie, vol ou vandalisme, autre. Un incident est distinct d'une maintenance planifiée : il se déclare, se décrit, se suit (statut, assurance) et se rattache depuis #813 à **ce qui est en cause** — le bateau entier, un équipement ou une pièce moteur.

## Modèle de données

### `boat_incidents`

- `id`, `boatId`, `organizationId`
- `occurredAt` (timestamp, indexé), `type` (CHECK : les 8 types de `INCIDENT_TYPES`), `location` (nullable), `description`
- `insuranceClaimed` (bool), `insuranceClaimRef` (nullable)
- `status` (CHECK : `open | in_progress | closed`), `closedAt` — posé au passage à `closed`, remis à `null` à la réouverture
- `createdBy` (FK `users` nullable, `SET NULL`) — le déclarant (#816), posé par `createForBoat` : la déclaration manuelle et celle du copilote passent par le même chemin. Relation `creator` sur le modèle.
- **cible (#813)**, six FK nullables `SET NULL`, **au plus une posée** : `boatEngineId`, `boatSailId`, `boatRigId`, `boatSafetyEquipmentId`, `boatGenericEquipmentId`, `boatEnginePartId`. Supprimer l'équipement conserve l'incident, qui vise alors le bateau entier.

Types partagés : `shared/types/incident.ts` — `IncidentTargetType = EquipmentReferenceType | 'engine_part'`, `IncidentTargetRef { type, id }`, `IncidentTargetSummary { type, id, name, engineId? }`, `BoatIncidentRow`. Helper : `shared/helpers/incident_target.ts` (`incidentTargetFieldName`, `incidentTargetRefOf`, `incidentTargetColumns`, `hasIncidentTargetInput`).

`EquipmentReferenceType` n'est volontairement **pas** étendu avec `engine_part` : il sert de clé de `Record` dans `maintenance_task_equipment.ts` et `use_task_equipment_options.ts`, et de `CHECK` SQL sur `boat_equipment_actions.equipment_type`. `TaskEquipmentRef` reste structurellement assignable à `IncidentTargetRef` : une carte d'équipement émet le même `{ type, id }` pour une tâche ou un incident.

## ACL

Capacités `incidents.view | create | edit | delete` (`shared/types/permissions.ts`), policy `app/policies/incident_policy.ts` (`OrgScopedPolicy`). `delete` est réservé aux admins.

La fiche bateau expose trois props lues sur cette policy — `canCreateIncidents`, `canEditIncidents`, `canDeleteIncidents` — et l'onglet Incidents reçoit `canCreate` / `canEdit` / `canDelete` (#816). Il recevait auparavant `canManageMaintenance` (`boats.edit`) : un membre autorisé par `IncidentPolicy` mais sans `boats.edit` ne voyait pas les boutons que le contrôleur lui accordait.

## Routes → controllers → services

- `POST /boats/:boatId/incidents` (`boats.incidents.store`), `PUT …/:incidentId` (`update`), `DELETE …/:incidentId` (`destroy`) → `BoatIncidentsController` → `BoatIncidentService`. Redirection vers `/boats/:id?tab=incidents` avec flash `flash.incidents.*`.
- **Audit (#816)** : le contrôleur journalise `incident.create`, `incident.update` (métadonnées `boatName`, `type`, `status` atteint) et `incident.delete` via `AuditLogService` — un refus métier ou un incident introuvable ne journalise rien. `incident.create` est aussi posé par le copilote (`report_incident`).
- **Hors-ligne (#816)** : un refus métier de `store` (`descriptionRequired`, `multipleEquipment`, `equipmentNotFound`) flashe `rejectedType = create-incident`, un refus ou un incident introuvable en `update` flashe `update-incident` — sans quoi `drainQueue` lirait la redirection comme un succès et détruirait la saisie (cf. `docs/domain/offline-queue.md`). L'édition reste sans verrou optimiste (`conflictType`).
- `GET /navigation/incidents` (`navigation.incidents`) → `NavigationController.incidents` → `NavigationService.getFleetIncidents`.
- Lecture sur la fiche bateau : prop **différée** `incidents` du groupe `navigation` (`BoatsController.show`).

### Règles du service

- `description` obligatoire (`descriptionRequired`).
- Cible : `resolveIncidentTarget` lit les six colonnes du payload — deux renseignées → `multipleEquipment` ; l'équipement doit appartenir au bateau (`equipmentNotFound`), une pièce étant bornée par son moteur (`whereHas('engine', boatId)`).
- En mise à jour, **une clé de cible présente (même à `null`) recalcule toute la cible** — c'est ainsi qu'on la change ou la retire ; absente, elle reste intacte. Le formulaire d'édition envoie toujours les six clés.
- `listForBoat` / `getFleetIncidents` préchargent les relations restreintes aux colonnes du libellé (`preloadIncidentTargets`) ; `toIncidentTarget` (`boat_transformer.ts`) produit le `target` servi au front — `name` brut : `brand model` (ou n° de série) pour un moteur, clé `sailType` pour une voile, clé `equipmentType` pour la sécurité, `name` pour un générique, `designation` pour une pièce, `null` pour le gréement.

## UI

- Onglet **Incidents** de la fiche bateau : `BoatShowTabIncidents` → `BoatIncidentModal` → `BoatIncidentForm` (`useForm`, hors-ligne via `create-incident` / `update-incident`, cible dans les six colonnes du formulaire). `IncidentTargetSelect` mêle toutes les familles dans un seul sélecteur (« Tout le bateau » par défaut) et se réduit à une puce quand la cible est verrouillée ; sans `equipment` (page flotte, dashboard) il n'est pas rendu.
- **Points d'entrée contextualisés (#813)** : `EquipmentReportIncidentButton` sur chaque carte de l'onglet Équipements (modale verrouillée sur l'équipement) ; `EquipmentIncidentAction` dans l'en-tête des six pages équipement/pièce (`canReportIncident`) — seul point d'entrée pour une **pièce**, que la fiche bateau ne liste pas ; entrée « Un incident » du menu « + Ajouter » (`BoatCreateIntent = 'incident'`, consommé par l'onglet à son montage).
- `IncidentTargetBadge` : puce « Moteur · Yamaha F100 » avec lien vers la page de l'équipement ou de la pièce, sur l'onglet, `IncidentRow` et `IncidentCard`.
- Ajout rapide : `QuickAddIncidentModal` (page flotte, dashboard) — sans sélecteur de cible, faute de données équipement dans `FleetBoatOption`.

## Photos et page de détail (#814)

- `GET /boats/:boatId/incidents/:incidentId` (`boats.incidents.show`) → `BoatIncidentsController.show` (`IncidentPolicy.view`) → page `boats/incident_show` : en-tête (`IncidentShowHeader`), description, galerie (`IncidentShowTabPhotos` → `MediaPhotoGallery`). Les cartes de l'onglet et les lignes de la page flotte y mènent.
- `POST …/incidents/:incidentId/photos` et `DELETE …/photos/:mediaId` → `BoatIncidentMediaController` (autorisé par **`IncidentPolicy.edit`**, pas `BoatPolicy.edit` comme les équipements). Deux gardes IDOR : `BoatIncidentService.findForBoat` (l'incident est du bateau, lui-même scopé à l'organisation) puis `mediaService.getForEntity(mediaId, 'boat_incident', incidentId)`. Redirection vers la page de détail ; incident étranger → `/boats/:id?tab=incidents`.
- Médias : `entity_type = 'boat_incident'` (`MEDIA_ENTITY_TYPES`), dossier `CloudinaryFolders.boatIncidentPhotos` (`…/boats/{id}/incidents/{id}/photos`), route dans `LARGE_UPLOAD_ROUTES`. Purge à la suppression de l'incident (`deleteForBoat(…, org)`) et du bateau (`BoatHullService.deleteForUser`).
- `BoatIncidentRow.photosCount` (compteur seul, une requête groupée dans `listForBoat`) : les médias ne voyagent jamais dans la prop différée `incidents`.
- Hors-ligne : la déclaration d'un incident est enfilée, **pas** les photos — `usePhotoUpload` refuse l'envoi sans réseau (#621), le bouton est désactivé avec un message.

## Suites : tâche et action à réparer (#815)

- `boat_incident_id` (FK nullable `SET NULL`, indexée) sur **`boat_maintenance_tasks`** et **`boat_equipment_actions`** — même motif qu'`inspection_id` (#311). Supprimer l'incident conserve la suite, qui perd son origine. `BoatEquipmentActionRow.boatIncidentId` et `MaintenanceTaskRow.boatIncidentId` l'exposent au front.
- **Services** : `boatIncidentId` sur `CreateMaintenanceTaskPayload` / `CreateEquipmentActionPayload`, borné au bateau par `incidentBelongsToBoat` (`app/utils/incident_utils.ts`) → `incidentNotFound` dans le domaine appelant (`flash.maintenanceTasks.incidentNotFound`, `flash.equipmentActions.incidentNotFound`). `BoatMaintenanceTaskService.listForIncident(boatId, incidentId)` et `BoatEquipmentActionService.listForIncident(user, boat, incident)`. Le clone récurrent de `markDone` ne reporte pas l'incident.
- **Routes** : aucune nouvelle — `boats.maintenanceTasks.store` et `boats.equipmentActions.store` acceptent `boatIncidentId` (champ caché) ; la seconde répond désormais `redirect().back()` pour revenir sur l'onglet ou la page d'origine. `boats.incidents.show` sert en plus `tasks`, `actions`, `equipment` (`TaskEquipmentSource`), `canCreateTask` (`MaintenancePolicy.create`), `canCreateAction` (`EquipmentActionPolicy.create`).
- **UI** : `IncidentFollowUpButtons` (« Créer une tâche » / « Action à réparer ») émet un pré-remplissage calculé par `inertia/utils/incident_follow_ups.ts` — titre depuis le type d'incident, même équipement verrouillé, action `to_repair`, `boatIncidentId` caché. Une **pièce moteur** n'est pas rabattue sur son moteur : ni tâche ni action ne savent la viser, elle reste tracée par l'incident seul. L'onglet (`BoatIncidentCard`, extraite de `BoatShowTabIncidents`) et la page de détail (`IncidentShowFollowUps`) hébergent chacun une modale de tâche et une modale d'action. Badge « n suites » compté côté client depuis `maintenanceTasks` / `equipmentActions` (groupe différé `maintenance`, distinct du groupe `navigation` des incidents : rien tant qu'ils ne sont pas chargés) ; sections « Tâches liées » / « Actions liées » en lecture seule sur la page de détail.
- **Audit** : `maintenance_task.create` porte `incidentId` quand la tâche vient d'un incident.

## Copilote

Action confirmable `report_incident` (`incidents.create`), avec `boatEngineId` facultatif (#813) — un moteur hors du bateau est une réponse invalide, comme pour `log_fuel`. Les autres cibles passent par l'UI. Fiche produit `incidents` dans `shared/constants/assistant/product_knowledge.ts`.

## Chantiers suivants

- Verrou optimiste sur l'édition d'un incident (`conflictType` + `_expectedUpdatedAt`) — seule case encore vide du protocole hors-ligne pour ce domaine.
