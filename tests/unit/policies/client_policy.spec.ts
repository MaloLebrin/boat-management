import { testPolicyMatrix } from '#tests/support/policy_matrix'
import ClientPolicy from '#policies/client_policy'

/**
 * Clients : quatre actions sans ressource. `anonymize` est admin-only au même
 * titre que `delete` — c'est une suppression RGPD irréversible (#690).
 */

testPolicyMatrix('ClientPolicy (unit)', () => new ClientPolicy(), [
  {
    name: 'create',
    capability: 'clients.create',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'update',
    capability: 'clients.update',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'clients.delete',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'anonymize',
    capability: 'clients.anonymize',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
