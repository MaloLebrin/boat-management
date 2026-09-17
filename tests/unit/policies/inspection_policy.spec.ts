import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import InspectionPolicy from '#policies/inspection_policy'

/**
 * États des lieux : la ressource scopée est la **réservation**, pas le bateau —
 * `BoatReservation` porte sa propre colonne `organization_id` (#690).
 */

testPolicyMatrix('InspectionPolicy (unit)', () => new InspectionPolicy(), [
  {
    name: 'view',
    capability: 'inspections.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'create',
    capability: 'inspections.create',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
  },
  {
    name: 'edit',
    capability: 'inspections.edit',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
  },
  {
    name: 'delete',
    capability: 'inspections.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member'],
  },
])
