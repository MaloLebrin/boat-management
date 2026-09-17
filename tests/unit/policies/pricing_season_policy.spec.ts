import { testPolicyMatrix } from '#tests/support/policy_matrix'
import PricingSeasonPolicy from '#policies/pricing_season_policy'

/**
 * Saisons tarifaires : trois actions sans ressource (#690).
 */

testPolicyMatrix('PricingSeasonPolicy (unit)', () => new PricingSeasonPolicy(), [
  {
    name: 'create',
    capability: 'pricing_seasons.create',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'update',
    capability: 'pricing_seasons.update',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'pricing_seasons.delete',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
