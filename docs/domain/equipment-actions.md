# Domaine — Actions sur équipements (pièces à acheter/remplacer/réparer)

## Objectif fonctionnel

Les actions sur équipements sont des **listes d'opérations à mener** sur les équipements d'un bateau. À la différence des événements de maintenance (historique immuable) et des fiches de maintenance (checklists guidées), une action est :

- **actionnable** : un suivi de traitement avec statut (en attente, commandé, terminé, annulé)
- **budgétisée** : coût estimé et coût réel traçables
- **polymorphe** : peut être liée à un équipement spécifique (générique, sécurité, moteur, voile, gréement) ou être une action libre

## Les trois types d'actions

| Type         | Description                  |
| ------------ | ---------------------------- |
| `to_buy`     | Pièce/équipement à acheter   |
| `to_replace` | Pièce/équipement à remplacer |
| `to_repair`  | Pièce/équipement à réparer   |

## Modèle de données

Références : `app/models/boat_equipment_action.ts`, `database/schema.ts`.

### `boat_equipment_actions`

| Colonne           | Type           | Description                                                         |
| ----------------- | -------------- | ------------------------------------------------------------------- |
| `id`              | INTEGER PK     | Identifiant unique                                                  |
| `boat_id`         | FK             | Bateau propriétaire (CASCADE DELETE)                                |
| `organization_id` | FK             | Organisation (CASCADE DELETE, dénormalisé pour scope org)           |
| `action_type`     | VARCHAR        | `to_buy \| to_replace \| to_repair`                                 |
| `status`          | VARCHAR        | `pending` (défaut) \| `ordered` \| `done` \| `cancelled`            |
| `label`           | VARCHAR        | Libellé de l'action (requis)                                        |
| `notes`           | TEXT NULL      | Remarques libres                                                    |
| `estimated_cost`  | DECIMAL(10,2)  | Coût estimé (nullable)                                              |
| `actual_cost`     | DECIMAL(10,2)  | Coût réel (nullable, requis pour statut `done`)                     |
| `equipment_type`  | VARCHAR NULL   | `generic \| safety \| engine \| sail \| rig` (référence polymorphe) |
| `equipment_id`    | INTEGER NULL   | ID de l'équipement lié (référence polymorphe)                       |
| `inspection_id`   | FK NULL        | Référence future vers `boat_inspections` (SET NULL on delete)       |
| `created_by`      | FK             | Utilisateur créateur (CASCADE DELETE)                               |
| `resolved_at`     | TIMESTAMP NULL | Date de résolution (auto-positionné au passage à `done`)            |
| `created_at`      | TIMESTAMP      | Date de création                                                    |
| `updated_at`      | TIMESTAMP NULL | Date de modification                                                |

## Règles métier

- Un utilisateur ne peut accéder qu'aux actions des bateaux de **sa propre organisation** (`assertBoatScope` dans le service).
- Le passage au statut `done` **nécessite** `actual_cost` renseigné. Sinon, rejet avec erreur `actualCostRequired`.
- Quand le statut passe à `done`, `resolved_at` est positionné automatiquement à `DateTime.now()` si absent.
- Si le statut repasse à autre chose que `done`, `resolved_at` est remis à `null`.
- La suppression d'un bateau supprime toutes ses actions (CASCADE DB).

## Routes → controllers → services

Références :

- Routes : `start/routes/boats.ts`
- Controller : `app/controllers/boat_equipment_actions_controller.ts`
- Service : `app/services/boat_equipment_action_service.ts`
- Policy : `app/policies/equipment_action_policy.ts`

### Créer une action

- `POST /boats/:boatId/equipment-actions` (`boats.equipmentActions.store`)
  - Controller : `BoatEquipmentActionsController.store`
  - Validation : `createBoatEquipmentActionValidator` — label (requis), actionType (enum), notes/estimatedCost/equipmentType/equipmentId (opt.)
  - ACL : `bouncer.with(EquipmentActionPolicy).authorize('create', boat)`
  - Service : `BoatEquipmentActionService.createForBoat`
  - Effet : crée l'action avec statut `pending`

### Modifier une action

- `PUT /boats/:boatId/equipment-actions/:actionId` (`boats.equipmentActions.update`)
  - Controller : `BoatEquipmentActionsController.update`
  - Validation : `updateBoatEquipmentActionValidator` — tous champs optionnels + status
  - ACL : `equipmentActions.edit`
  - Service : `BoatEquipmentActionService.updateForBoat`
  - Effet : met à jour les champs + gère la règle `done` → `actual_cost` requis

### Supprimer une action

- `DELETE /boats/:boatId/equipment-actions/:actionId` (`boats.equipmentActions.destroy`)
  - Controller : `BoatEquipmentActionsController.destroy`
  - ACL : `equipmentActions.delete` (admin only)
  - Service : `BoatEquipmentActionService.deleteForBoat`

## Capacités Bouncer

| Capacité                  | Admin | Member |
| ------------------------- | ----- | ------ |
| `equipmentActions.view`   | x     | x      |
| `equipmentActions.create` | x     | x      |
| `equipmentActions.edit`   | x     | x      |
| `equipmentActions.delete` | x     |        |

## Types partagés

Les types sont définis dans `shared/types/equipment_action.ts` et importables côté frontend :

- `EquipmentActionType` : `'to_buy' | 'to_replace' | 'to_repair'`
- `EquipmentActionStatus` : `'pending' | 'ordered' | 'done' | 'cancelled'`
- `EquipmentReferenceType` : `'generic' | 'safety' | 'engine' | 'sail' | 'rig'`
- `CreateEquipmentActionPayload` : payload de création
- `UpdateEquipmentActionPayload` : payload de mise à jour
- `BoatEquipmentActionRow` : représentation sérialisée pour le frontend

## i18n

Fichiers : `resources/lang/{fr,en}/equipmentActions.json`

Clés principales :

- `tab` : titre de l'onglet
- `empty` : message si liste vide
- `addAction` : bouton d'ajout
- `status.*` : libellés des statuts
- `actionType.*` : libellés des types d'action
- `equipmentType.*` : libellés des types d'équipement
- `fields.*` : libellés des champs du formulaire
- `form.*` : titres et boutons du formulaire

Messages flash : `flash.equipmentActions.*` dans `resources/lang/{fr,en}/flash.json`
