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
  - `subject`: `boat | engine | sail | rig`
  - `performed_at` (date)
  - `title`, `notes`
  - cibles optionnelles selon le sujet:
    - `boat_engine_id`, `engine_caption`
    - `boat_sail_id`, `sail_caption`
    - `boat_rig_id`
- `boat_maintenance_parts`
  - `maintenance_event_id`
  - `name`, `quantity` (int ou null), `notes`

## Routes → controllers → services → UI

Références:

- routes: `start/routes/boats.ts`
- controller: `app/controllers/boat_maintenances_controller.ts`
- service: `app/services/boat_maintenance_service.ts`
- UI: `inertia/components/boats/maintenance/BoatShowMaintenanceSection.vue` (section “Maintenance history”)

### Créer une entrée

- `POST /boats/:boatId/maintenance`
  - Controller: `BoatMaintenancesController.store`
  - Validation: `createBoatMaintenanceValidator` (`app/validators/boat_maintenance.ts`)
  - ACL: `bouncer.authorize('boatUpdate', boat)`
  - Service: `BoatMaintenanceService.createForBoat`

Règles côté service (résumé, source: `BoatMaintenanceService.createForBoat`):

- user doit appartenir à la même org que le boat
- `subject` valide: `boat | engine | sail | rig`
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

## UI (boat show)

La page `inertia/pages/boats/show.vue` passe à `BoatShowMaintenanceSection`:

- `maintenanceEvents`: array `MaintenanceEventRow`
- `canManageMaintenance`: active les formulaires (create/delete)

Référence types: `inertia/types/boat_show.ts`.

