# Domaine — Maintenance history (events + parts)

## Objectif fonctionnel

Tracer l’historique de maintenance d’un bateau:

- créer une entrée de maintenance (date, sujet, titre, notes, pièces remplacées)
- lister l’historique (ordre décroissant sur `performedAt`)
- supprimer une entrée si besoin

## Modèle de données

Références: `app/models/boat_maintenance_event.ts`, `app/models/boat_maintenance_part.ts`, `database/schema.ts`.

- `boat_maintenance_events`
  - `boat_id`
  - `subject`: une des 10 valeurs de `MAINTENANCE_SUBJECTS` (`boat | hull | engine | sail | rig | electrical | plumbing | safety | deck | other`), source unique dans `shared/constants/maintenance/maintenance_subjects.ts`
  - `performed_at` (date)
  - `title`, `notes`
  - cibles optionnelles selon le sujet:
    - `boat_engine_id`, `engine_caption`
    - `boat_sail_id`, `sail_caption`
    - `boat_rig_id`
- `boat_maintenance_parts`
  - `maintenance_event_id`
  - `name`, `quantity` (int ou null), `notes`

Le `title` est un texte libre plafonné à 200 caractères.

## Routes → controllers → services → UI

Références:

- routes: `start/routes/boats.ts`
- controller: `app/controllers/boat_maintenances_controller.ts`
- service: `app/services/boat_maintenance_service.ts`
- UI: `inertia/components/boats/show/tabs/BoatShowTabHistory.vue` (onglet « Historique »)

### Créer une entrée

- `POST /boats/:boatId/maintenance`
  - Controller: `BoatMaintenancesController.store`
  - Validation: `createBoatMaintenanceValidator` (`app/validators/boat_maintenance.ts`)
  - ACL: `bouncer.authorize('boatUpdate', boat)`
  - Service: `BoatMaintenanceService.createForBoat`

Règles côté service (résumé, source: `BoatMaintenanceService.createForBoat`):

- user doit appartenir à la même org que le boat
- `subject` valide: une des 10 valeurs de `MAINTENANCE_SUBJECTS`
- `subject=engine`:
  - si un `boatEngineId` est fourni, il doit appartenir au boat
  - `engineCaption` doit être fourni ou dérivable de l’engine
- `subject=sail`: règles analogues via `boatSailId`/`sailCaption`
- `subject=rig`: `boatRigId` requis et doit appartenir au boat
- `parts[]`:
  - `name` est trim + obligatoire (lignes vides filtrées)
  - `quantity` si fourni doit être un entier positif

### Supprimer une entrée

- `DELETE /boats/:boatId/maintenance/:eventId`
  - Controller: `BoatMaintenancesController.destroy`
  - ACL: `boatUpdate`
  - Service: `BoatMaintenanceService.deleteForBoat`

## Catalogue d'opérations standard (#581)

Le champ titre des deux modales d'événement
(`BoatMaintenanceEventModal.vue`, `EngineMaintenanceEventModal.vue`) est une
**combobox** alimentée par `shared/constants/maintenance/maintenance_operations.ts`.

- retenir une opération remplit le titre et aligne le `subject` — un événement
  n'ayant pas de récurrence, il n'y a rien d'autre à pré-remplir ;
- la **saisie libre reste acceptée telle quelle** et part inchangée au serveur ;
- sur la modale moteur, le sujet est figé et les opérations sont filtrées par la
  famille de ce moteur précis (voir `docs/domain/maintenance-tasks.md` pour le
  détail du corpus et des familles).

Normaliser les titres à la saisie sert directement l'analyse de flotte :
`app/services/ai_prompt_service.ts` transmet ces titres verbatim à l'IA.

## UI (boat show)

La page `inertia/pages/boats/show.vue` passe à `BoatShowTabHistory` (via `BoatShowTabContent`):

- `maintenanceEvents`: array `MaintenanceEventRow`
- `canManageMaintenance`: active les formulaires (create/delete)

Référence types: `inertia/types/boat_show.ts`.
