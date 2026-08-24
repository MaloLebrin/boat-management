# 2026-07-07 — [#312] Interface des actions sur équipements (achats/réparations)

Ajout de l'interface utilisateur pour visualiser et gérer les actions sur équipements depuis la fiche bateau, en tant que nouvel onglet "Achats/réparations".

- **Backend** : branchement de `BoatEquipmentActionService.listForBoat()` dans `BoatsController.show()` avec les permissions `canManageEquipmentActions` et `canDeleteEquipmentActions` via `EquipmentActionPolicy`.
- **Transformer** : ajout de `equipmentActions`, `canManageEquipmentActions`, `canDeleteEquipmentActions` dans `BoatManageContext` et `toManageProps()`.
- **Page** : nouvel onglet `equipmentActions` dans `inertia/pages/boats/show.vue` avec clé de tab correspondante pour le paramètre URL `?tab=equipmentActions`.
- **Composants** :
  - `inertia/components/boats/equipment-actions/BoatEquipmentActionCard.vue` — carte affichant une action avec badges type/statut, coûts, boutons édition/suppression.
  - `inertia/components/boats/equipment-actions/BoatEquipmentActionModal.vue` — modal création/édition avec champs label, actionType, notes, estimatedCost (+ actualCost et status en édition).
  - `inertia/components/boats/show/tabs/BoatShowTabEquipmentActions.vue` — onglet avec filtres par statut et type, liste des actions, empty state.
- **Types frontend** : ré-export des types depuis `shared/types/equipment_action.ts` dans `inertia/types/boat_show.ts`.
- **i18n** : clé `boats.show.tabs.equipmentActions` (FR: "Achats/réparations", EN: "Purchases/repairs"), clés filtres `equipmentActions.filters.*`.
- **Tests Vitest** : `boat_equipment_action_card.spec.ts`, `boat_equipment_action_modal.spec.ts`, `boat_show_tab_equipment_actions.spec.ts`.
