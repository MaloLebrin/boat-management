import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import FuelLogPolicy from '#policies/fuel_log_policy'

/**
 * Pleins de carburant : deux actions seulement — il n'y a ni lecture ni
 * édition, le relevé se consulte avec le bateau et ne se corrige pas (#690).
 */

testPolicyMatrix('FuelLogPolicy (unit)', () => new FuelLogPolicy(), [
  {
    name: 'create',
    capability: 'fuel_logs.create',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'fuel_logs.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
