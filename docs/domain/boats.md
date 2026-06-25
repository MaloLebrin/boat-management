# Domaine — Boats & equipment

## Objectif fonctionnel

Gérer une flotte de bateaux au sein d’une **organisation**:

- créer / lister / afficher / modifier / supprimer un boat
- gérer l’équipement associé:
  - moteurs (engines)
  - voiles (sails)
  - gréement (rig)

## ACL (qui a le droit ?)

Référence: `app/abilities/main.ts`.

- `boatCreate`: user doit appartenir à une org (`organizationId != null`)
- `boatView`, `boatUpdate`, `boatDelete`: user et boat dans la **même org**

## Routes → controllers → pages (Inertia)

Référence routes: `start/routes/boats.ts`.

### Boats

- `GET /boats` (`boats.index`)
  - Controller: `app/controllers/boats_controller.ts` → `index`
  - Service: `app/services/boat_service.ts` → `listForUser`
  - Page: `inertia/pages/boats/index.vue`
- `GET /boats/new` (`boats.create`)
  - Controller: `BoatsController.create`
  - ACL: `bouncer.authorize('boatCreate')`
  - Page: `inertia/pages/boats/new.vue`
- `POST /boats` (`boats.store`)
  - Controller: `BoatsController.store` (validator `createBoatValidator`)
  - Service: `BoatService.createForUser`
  - Redirect: `/boats/:id`
- `GET /boats/:id` (`boats.show`)
  - Controller: `BoatsController.show`
  - Services:
    - `BoatService.getForUserOrFail`
    - `BoatMaintenanceService.listForBoat`
    - `BoatMaintenanceTaskService.listForBoat`
  - Page: `inertia/pages/boats/show.vue`
  - Composants:
    - `inertia/components/boats/hull/BoatShowSpecsCard.vue`
    - `inertia/components/boats/engine/BoatShowEnginesCard.vue`
    - `inertia/components/boats/sail/BoatShowSailsCard.vue`
    - `inertia/components/boats/rig/BoatShowRigCard.vue`
    - `inertia/components/boats/maintenance/BoatShowMaintenanceSection.vue`
- `GET /boats/:id/edit` (`boats.edit`)
  - Controller: `BoatsController.edit`
  - Page: `inertia/pages/boats/edit.vue`
- `PUT /boats/:id` (`boats.update`)
  - Controller: `BoatsController.update` (validator `updateBoatValidator`)
  - Service: `BoatService.updateForUser`
  - Redirect: `/boats/:id`
- `DELETE /boats/:id` (`boats.destroy`)
  - Controller: `BoatsController.destroy`
  - Service: `BoatService.deleteForUser`
  - Redirect: `/boats`

### Equipment (engines/sails/rig)

Référence: `app/controllers/boat_equipment_controller.ts` et `app/services/boat_service.ts`.

- **Engines**
  - `POST /boats/:boatId/engines` → `BoatEquipmentController.storeEngine`
    - Service: `BoatService.createEngine`
  - `GET /boats/:boatId/engines/:engineId/edit` → `BoatEquipmentController.editEngine`
    - Page: `inertia/pages/boats/engine_edit.vue`
  - `PUT /boats/:boatId/engines/:engineId` → `BoatEquipmentController.updateEngine`
    - Service: `BoatService.updateEngine`
  - `DELETE /boats/:boatId/engines/:engineId` → `BoatEquipmentController.destroyEngine`
    - Service: `BoatService.deleteEngine`
- **Sails**
  - `POST /boats/:boatId/sails` → `storeSail` (create)
  - `GET /boats/:boatId/sails/:sailId/edit` → `editSail`
    - Page: `inertia/pages/boats/sail_edit.vue`
  - `PUT /boats/:boatId/sails/:sailId` → `updateSail`
  - `DELETE /boats/:boatId/sails/:sailId` → `destroySail`
- **Rig**
  - `GET /boats/:boatId/rig/edit` → `editRig`
    - Page: `inertia/pages/boats/rig_edit.vue`
  - `PUT /boats/:boatId/rig` → `upsertRig` (create or update)
    - Service: `BoatService.upsertRig`
  - `DELETE /boats/:boatId/rig` → `destroyRig`
    - Service: `BoatService.deleteRig`

### Budget

Référence: `app/controllers/budget_controller.ts`, `app/services/budget_service.ts`.

- `GET /boats/:id/budget` (`boats.budget.show`)
  - Controller: `BudgetController.show` (validator `budgetYearValidator` pour `?year=`)
  - Services: `BudgetService.getForBoat`, `BoatPortStayService.listForBoat`, `BoatBudgetEntryService.listForBoat`
  - Page: `inertia/pages/boats/budget.vue`
  - Props: `boat`, `budget` (totaux + mensuel), `year`, `portStays`, `entries`, `canManage`

### Port stays

Référence: `app/controllers/boat_port_stay_controller.ts`, `app/services/boat_port_stay_service.ts`.

- `POST /boats/:id/port-stays` → `BoatPortStayController.store`
  - Validator: `boatPortStayValidator`
  - Service: `BoatPortStayService.create`
- `DELETE /boats/:id/port-stays/:stayId` → `BoatPortStayController.destroy`
  - Service: `BoatPortStayService.delete`

### Budget entries (dépenses libres)

Référence: `app/controllers/boat_budget_entry_controller.ts`, `app/services/boat_budget_entry_service.ts`.

- `POST /boats/:id/budget/entries` → `BoatBudgetEntryController.store`
  - Validator: `budgetEntryValidator`
  - Service: `BoatBudgetEntryService.create`
  - Catégories: `maintenance | fuel | documents | port | equipment | other`
- `DELETE /boats/:id/budget/entries/:entryId` → `BoatBudgetEntryController.destroy`
  - Service: `BoatBudgetEntryService.delete`

## Règles métier notables

Référence: `app/services/boat_service.ts`.

- Si `propulsionType === 'sailboat'`, alors `mastHeightM` est requis (create + update).
