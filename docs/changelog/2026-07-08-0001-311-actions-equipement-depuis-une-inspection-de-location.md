# 2026-07-08 — [#311] Actions équipement depuis une inspection de location (« Défauts constatés »)

Permet, sur l'écran d'inspection (checkout/checkin), de tracer les défauts constatés en créant des `BoatEquipmentAction` liées à l'inspection. Exploite la colonne `inspection_id` posée en #310 (aucune migration).

- **Service** (`app/services/boat_equipment_action_service.ts`) : `createFromInspection(user, boat, inspection, payload)` (boat/org **déduits**, `inspection_id` positionné, statut `pending`) et `listForInspection(user, boat, inspection)`. Le `inspection_id` est désormais exposé (`BoatEquipmentActionRow` + transformer + colonnes de `select`).
- **Controller** (`BoatInspectionsController`) : `storeEquipmentAction` / `destroyEquipmentAction`, redirigeant vers l'écran d'inspection. La cohérence bateau ↔ réservation ↔ inspection est garantie par la chaîne de résolution imbriquée (un id d'un autre bateau/org ne crée rien).
- **Routes** : `POST`/`DELETE /boats/:boatId/reservations/:reservationId/inspections/:inspectionId/equipment-actions(/:actionId)`. Ajout du matcher numérique `actionId` (`start/routes/_matchers.ts`) — corrige aussi un 500 latent sur les routes équipement de #312.
- **ACL** : ajout via `EquipmentActionPolicy.create` (membre), suppression `…delete` (admin).
- **Frontend** : section « Défauts constatés » (`InspectionDefects.vue` + `InspectionDefectModal.vue`) montée dans `InspectionPanel.vue` ; l'édition/statut restent dans l'onglet équipement du bateau (#312). i18n `equipmentActions.defects.*` (fr + en).
- **Tests** : fonctionnels `tests/functional/boats/inspection_equipment_actions.spec.ts` (création + boat_id déduit, IDOR bateau/org, listing, suppression admin, refus membre) ; Vitest `tests/inertia/inspection_defects.spec.ts`.
- **Doc** : `docs/domain/equipment-actions.md` § « Origine inspection ».
