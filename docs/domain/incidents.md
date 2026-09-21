# Domaine — Incidents

## Objectif fonctionnel

Déclarer et suivre les événements imprévus d'un bateau (#106) : échouage, voie d'eau, casse voilure/gréement, avarie moteur, collision, incendie, vol ou vandalisme, autre. Un incident est distinct d'une maintenance planifiée : il se déclare, se décrit, se suit (statut, assurance) et se rattache depuis #813 à **ce qui est en cause** — le bateau entier, un équipement ou une pièce moteur.

## Modèle de données

### `boat_incidents`

- `id`, `boatId`, `organizationId`
- `occurredAt` (timestamp, indexé), `type` (CHECK : les 8 types de `INCIDENT_TYPES`), `location` (nullable), `description`
- `insuranceClaimed` (bool), `insuranceClaimRef` (nullable)
- `status` (CHECK : `open | in_progress | closed`), `closedAt` — posé au passage à `closed`, remis à `null` à la réouverture
- **cible (#813)**, six FK nullables `SET NULL`, **au plus une posée** : `boatEngineId`, `boatSailId`, `boatRigId`, `boatSafetyEquipmentId`, `boatGenericEquipmentId`, `boatEnginePartId`. Supprimer l'équipement conserve l'incident, qui vise alors le bateau entier.

Types partagés : `shared/types/incident.ts` — `IncidentTargetType = EquipmentReferenceType | 'engine_part'`, `IncidentTargetRef { type, id }`, `IncidentTargetSummary { type, id, name, engineId? }`, `BoatIncidentRow`. Helper : `shared/helpers/incident_target.ts` (`incidentTargetFieldName`, `incidentTargetRefOf`, `incidentTargetColumns`, `hasIncidentTargetInput`).

`EquipmentReferenceType` n'est volontairement **pas** étendu avec `engine_part` : il sert de clé de `Record` dans `maintenance_task_equipment.ts` et `use_task_equipment_options.ts`, et de `CHECK` SQL sur `boat_equipment_actions.equipment_type`. `TaskEquipmentRef` reste structurellement assignable à `IncidentTargetRef` : une carte d'équipement émet le même `{ type, id }` pour une tâche ou un incident.

## ACL

Capacités `incidents.view | create | edit | delete` (`shared/types/permissions.ts`), policy `app/policies/incident_policy.ts` (`OrgScopedPolicy`). `delete` est réservé aux admins.

## Routes → controllers → services

- `POST /boats/:boatId/incidents` (`boats.incidents.store`), `PUT …/:incidentId` (`update`), `DELETE …/:incidentId` (`destroy`) → `BoatIncidentsController` → `BoatIncidentService`. Redirection vers `/boats/:id?tab=incidents` avec flash `flash.incidents.*`.
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

## Copilote

Action confirmable `report_incident` (`incidents.create`), avec `boatEngineId` facultatif (#813) — un moteur hors du bateau est une réponse invalide, comme pour `log_fuel`. Les autres cibles passent par l'UI. Fiche produit `incidents` dans `shared/constants/assistant/product_knowledge.ts`.

## Chantiers suivants

- #814 — photos et page de détail d'un incident.
- #815 — créer une tâche ou une action « à réparer » depuis un incident (`boat_incident_id` sur tâches et actions).
- #816 — `created_by`, `rejectedType` hors-ligne, droits `incidents.*` sur l'onglet, audit `incident.update/delete`.
