import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import InstrumentSourcePolicy from '#policies/instrument_source_policy'

/**
 * Instruments de bord Signal K (#988) : la ressource est le bateau. Lire et
 * pousser de la télémétrie suivent `boats.view` / `boats.edit` ; brancher ou
 * révoquer le serveur est réservé à l'admin (`instruments.manage`).
 */
testPolicyMatrix('InstrumentSourcePolicy (unit)', () => new InstrumentSourcePolicy(), [
  {
    name: 'view',
    capability: 'boats.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'ingest',
    capability: 'boats.edit',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'manage',
    capability: 'instruments.manage',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
