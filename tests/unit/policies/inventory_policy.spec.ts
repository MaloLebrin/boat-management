import { testPolicyMatrix } from '#tests/support/policy_matrix'
import InventoryPolicy from '#policies/inventory_policy'

/**
 * Inventaire de pièces (#892) : trois actions sans ressource. Le member gère
 * le stock et les commandes ; supprimer (un article et son journal, un
 * fournisseur, un bon) reste à l'admin. Le mechanic n'a que `maintenance.*`.
 */

testPolicyMatrix('InventoryPolicy (unit)', () => new InventoryPolicy(), [
  {
    name: 'view',
    capability: 'inventory.view',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'manage',
    capability: 'inventory.manage',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'inventory.delete',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])
