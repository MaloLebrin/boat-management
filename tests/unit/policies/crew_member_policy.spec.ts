import { testPolicyMatrix } from '#tests/support/policy_matrix'
import CrewMemberPolicy from '#policies/crew_member_policy'

/**
 * Équipage : trois actions sans ressource — la policy ne filtre que par
 * capability, le scope organisationnel est porté par le service (#690).
 */

testPolicyMatrix('CrewMemberPolicy (unit)', () => new CrewMemberPolicy(), [
  {
    name: 'create',
    capability: 'crew.create',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'update',
    capability: 'crew.update',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  // Suppression réservée aux admins : un membre ne retire pas un équipier.
  {
    name: 'delete',
    capability: 'crew.delete',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
