# 2026-07-07 — [#310] Actions sur équipements (pièces à acheter/remplacer/réparer)

Nouvelle entité `BoatEquipmentAction` pour tracer les actions à mener sur les équipements d'un bateau (acheter, remplacer, réparer) avec suivi de statut et coûts.

- **Migration** : `1816000000000_create_boat_equipment_actions_table.ts` avec contraintes CHECK sur `action_type`, `status`, `equipment_type`.
- **Modèle** : `app/models/boat_equipment_action.ts` avec `belongsTo Boat` et `belongsTo User` (créateur).
- **Types partagés** : `shared/types/equipment_action.ts` (`EquipmentActionType`, `EquipmentActionStatus`, `EquipmentReferenceType`, payloads, `BoatEquipmentActionRow`).
- **Capacités Bouncer** : `equipmentActions.view/create/edit` (membre) + `equipmentActions.delete` (admin only) dans `shared/types/permissions.ts`.
- **Service** : `app/services/boat_equipment_action_service.ts` avec méthodes `listForBoat`, `createForBoat`, `updateForBoat`, `deleteForBoat`. Règle métier : statut `done` nécessite `actual_cost` renseigné, `resolved_at` positionné automatiquement.
- **Policy** : `app/policies/equipment_action_policy.ts` étendant `OrgScopedPolicy`.
- **Controller** : `app/controllers/boat_equipment_actions_controller.ts` (store/update/destroy), réponses par redirection Inertia.
- **Routes** : `POST/PUT/DELETE /boats/:boatId/equipment-actions[/:actionId]` dans `start/routes/boats.ts`.
- **i18n** : `resources/lang/{fr,en}/equipmentActions.json` + `flash.equipmentActions.*`.
- **Documentation** : `docs/domain/equipment-actions.md`, mise à jour `docs/data/schema.md`.
