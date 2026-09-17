import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import SubscriptionPolicy from '#policies/subscription_policy'

/**
 * Abonnement : lecture ouverte aux membres, gestion réservée aux admins (#690).
 */

testPolicyMatrix('SubscriptionPolicy (unit)', () => new SubscriptionPolicy(), [
  {
    name: 'view',
    capability: 'subscription.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'manage',
    capability: 'subscription.manage',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
