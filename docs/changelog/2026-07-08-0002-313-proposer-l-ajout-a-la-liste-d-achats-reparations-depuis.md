# 2026-07-08 — [#313] Proposer l'ajout à la liste d'achats/réparations depuis un équipement dégradé

Dernier lot de l'épic « Actions équipement » (#310/#311/#312 déjà livrés). Sur l'onglet Équipement, une carte d'équipement en statut ≠ `ok` propose un bouton « Ajouter à la liste » qui ouvre le modal d'action **pré-rempli** (type/id d'équipement, libellé, `actionType` suggéré). Aucune création silencieuse : le modal sert de confirmation. Aucune migration, aucun nouvel endpoint.

- **Helper partagé** : `shared/helpers/equipment_action.ts` → `suggestEquipmentActionType(status)` (`to_replace`/`expired → 'to_replace'`, `to_check → 'to_repair'`).
- **Modal** : `BoatEquipmentActionModal.vue` gagne une prop optionnelle `prefill` (rétro-compatible) et soumet le lien via inputs cachés `equipmentType`/`equipmentId` (déjà acceptés par le validator #310).
- **Cartes** : `BoatGenericEquipmentCard.vue` / `BoatSafetyEquipmentCard.vue` — bouton contextuel sur les items dégradés (gaté `canManageActions`) + emit `addToActions`. `BoatShowTabEquipment.vue` héberge le modal ; `BoatShowTabContent.vue` propage `canManageEquipmentActions`.
- **Type** `EquipmentActionPrefill` (`inertia/types/boat_show.ts`). i18n `equipmentActions.prefill.addButton` (fr + en).
- **Tests** : Vitest (cartes : visibilité selon statut + payload émis ; modal : seed + inputs cachés ; helper). La persistance du lien est déjà couverte par `boat_equipment_actions.spec.ts` (« POST with equipment reference »).
- **Doc** : `docs/domain/equipment-actions.md` § « Origine équipement ».
