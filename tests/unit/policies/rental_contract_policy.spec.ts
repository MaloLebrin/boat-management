import { testPolicyMatrix, orgResource } from '#tests/support/policy_matrix'
import RentalContractPolicy from '#policies/rental_contract_policy'

/**
 * Contrats de location : scopés par la réservation, comme les états des lieux (#690).
 */

testPolicyMatrix('RentalContractPolicy (unit)', () => new RentalContractPolicy(), [
  {
    name: 'view',
    capability: 'rentalContracts.view',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'create',
    capability: 'rentalContracts.create',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
  },
  {
    name: 'edit',
    capability: 'rentalContracts.edit',
    resource: orgResource,
    allowedRoles: ['admin', 'member'],
  },
  {
    name: 'delete',
    capability: 'rentalContracts.delete',
    resource: orgResource,
    allowedRoles: ['admin'],
    deniedRoles: ['member'],
  },
])
