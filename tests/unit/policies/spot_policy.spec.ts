import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import SpotPolicy from '#policies/spot_policy'

/**
 * Places de port : `create` n'a pas de ressource (rien à scoper avant
 * l'écriture), les trois autres l'exigent (#690).
 */

testPolicyMatrix('SpotPolicy (unit)', () => new SpotPolicy(), [
  {
    name: 'view',
    capability: 'spots.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'create',
    capability: 'spots.create',
    allowedRoles: ['admin', 'member'],
  },
  {
    name: 'edit',
    capability: 'spots.edit',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
  },
  {
    name: 'delete',
    capability: 'spots.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member'],
  },
])
