import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import MaintenancePolicy from '#policies/maintenance_policy'

/**
 * Maintenance : la seule policy ouverte au rôle `mechanic`, dont les trois
 * capabilities (`maintenance.view/create/edit`) forment tout le périmètre —
 * `delete` lui reste fermée comme aux membres (#690).
 */

testPolicyMatrix('MaintenancePolicy (unit)', () => new MaintenancePolicy(), [
  {
    name: 'view',
    capability: 'maintenance.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member', 'mechanic'],
    deniedRoles: ['boat_owner'],
  },
  {
    name: 'create',
    capability: 'maintenance.create',
    resource: orgResource,
    allowedRoles: ['admin', 'member', 'mechanic'],
    deniedRoles: ['boat_owner'],
  },
  {
    name: 'edit',
    capability: 'maintenance.edit',
    resource: orgResource,
    allowedRoles: ['admin', 'member', 'mechanic'],
    deniedRoles: ['boat_owner'],
  },
  // Le mécanicien intervient, il n'efface pas l'historique.
  {
    name: 'delete',
    capability: 'maintenance.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
