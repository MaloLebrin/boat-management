import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import OrganizationInvitationPolicy from '#policies/organization_invitation_policy'

/**
 * Invitations : `create` et `revoke` partagent la même capability
 * `invitations.manage` — inviter et révoquer sont le même pouvoir (#690).
 */

testPolicyMatrix('OrganizationInvitationPolicy (unit)', () => new OrganizationInvitationPolicy(), [
  {
    name: 'view',
    capability: 'invitations.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'create',
    capability: 'invitations.manage',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'revoke',
    capability: 'invitations.manage',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
