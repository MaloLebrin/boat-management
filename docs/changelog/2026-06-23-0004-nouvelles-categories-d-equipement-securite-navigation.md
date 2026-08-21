# 2026-06-23 — Nouvelles catégories d'équipement (sécurité, navigation, électricité, mouillage, pont)

Extension du modal d'ajout d'équipement (`BoatEquipmentAddModal`) avec 5 nouvelles catégories. La catégorie **Sécurité** était déjà implémentée côté backend ; les 4 autres (`navigation`, `electrical`, `anchoring`, `deck`) utilisent un nouveau modèle générique `boat_generic_equipment`.

**Backend**

- `database/migrations/1800000002000_create_boat_generic_equipment_table.ts` — table `boat_generic_equipment` : `boat_id`, `category`, `name`, `brand`, `model`, `quantity`, `status`, `notes`
- `app/models/boat_generic_equipment.ts` — modèle Lucid étendant `BoatGenericEquipmentSchema`
- `shared/types/boat.ts` — constante `GENERIC_EQUIPMENT_CATEGORIES`, types `GenericEquipmentCategory` et `BoatGenericEquipmentPayload`
- `shared/constants/boats/boat_form_options.ts` — constante `GENERIC_EQUIPMENT_STATUS_OPTIONS` (ok / to_check / to_replace)
- `app/validators/boat_generic_equipment.ts` — validators `createGenericEquipmentValidator` et `updateGenericEquipmentValidator`
- `app/services/boat_generic_equipment_service.ts` — service avec `create`, `update`, `delete`
- `app/controllers/boat_generic_equipment_controller.ts` — contrôleur `store` / `update` / `destroy` ; redirige vers `?tab=equipment`
- `app/models/boat.ts` — relation `hasMany(() => BoatGenericEquipment)`
- `app/services/boat_hull_service.ts` — preload `genericEquipment` dans `getFullDetailForUser`
- `app/transformers/boat_transformer.ts` — `toGenericEquipmentItem`, ajouté dans `toBoatDetail`
- `start/routes/boats.ts` — `POST/PUT/DELETE /boats/:boatId/generic-equipment[/:itemId]`

**Frontend**

- `inertia/types/boat_show.ts` — type `BoatShowGenericEquipment`, champ `genericEquipment[]` dans `BoatShowDetail`
- `inertia/composables/use_boat_options.ts` — `genericEquipmentStatusOptions`
- `inertia/components/boats/equipment/BoatGenericEquipmentFields.vue` — formulaire générique (nom, marque, modèle, quantité, état, notes)
- `inertia/components/boats/equipment/BoatGenericEquipmentCard.vue` — card avec items groupés par catégorie + modaux create/edit/delete
- `inertia/components/boats/show/modals/BoatEquipmentAddModal.vue` — 5 nouvelles catégories ; catégorie transmise via `<input type="hidden" name="category">`
- `inertia/components/boats/show/tabs/BoatShowTabEquipment.vue` — filtre pill "Équipements" + `<BoatGenericEquipmentCard>`

**i18n**

- `resources/lang/fr/boats.json` — clés `equipmentAddModal.categories.*` (safety, navigation, electrical, anchoring, deck), section `genericEquipment`, `options.genericEquipmentStatus`
- `resources/lang/en/boats.json` — idem + ajout de la section `equipmentAddModal` manquante
- `resources/lang/{fr,en}/flash.json` — clés `genericEquipment.{created,updated,deleted,notFound}`

---
