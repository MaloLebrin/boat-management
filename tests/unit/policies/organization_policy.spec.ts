import { testPolicyMatrix } from '#tests/support/policy_matrix'
import OrganizationPolicy from '#policies/organization_policy'

/**
 * Organisation : la frontière admin/membre la plus large du produit — lecture
 * ouverte, configuration et facturation fermées (#690).
 */

testPolicyMatrix('OrganizationPolicy (unit)', () => new OrganizationPolicy(), [
  {
    name: 'viewMembers',
    capability: 'members.view',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'manageMembers',
    capability: 'members.manage',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'configureAI',
    capability: 'ai.configure',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'configureBranding',
    capability: 'branding.configure',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  // Import CSV en masse (#715) : aligné sur `maintenance.delete`, pas sur
  // `maintenance.create` — un mechanic écrivait tout l'historique sans jamais
  // pouvoir le corriger.
  {
    name: 'runImport',
    capability: 'import.run',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
  {
    name: 'viewAuditLog',
    capability: 'audit_log.view',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  // Facturation : personne d'autre que l'admin ne change le plan.
  {
    name: 'manageBilling',
    capability: 'subscription.manage',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
