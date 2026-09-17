import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import EquipmentActionPolicy from '#policies/equipment_action_policy'

/**
 * Actions d'équipement : les quatre actions exigent le bateau, donc le scope
 * organisationnel est vérifié à chaque fois (#690).
 */

testPolicyMatrix('EquipmentActionPolicy (unit)', () => new EquipmentActionPolicy(), [
  {
    name: 'view',
    capability: 'equipmentActions.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'create',
    capability: 'equipmentActions.create',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
  },
  {
    name: 'edit',
    capability: 'equipmentActions.edit',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
  },
  {
    name: 'delete',
    capability: 'equipmentActions.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member'],
  },
])
