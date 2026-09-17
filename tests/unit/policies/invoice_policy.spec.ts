import { test } from '@japa/runner'
import InvoicePolicy from '#policies/invoice_policy'
import { ORG_ID, OTHER_ORG_ID, orgResource, testPolicyMatrix } from '#tests/support/policy_matrix'
import { userWithCapabilities } from '#tests/support/policy_user'

/**
 * Factures (#690).
 *
 * `view` accepte une facture **optionnelle** et inverse l'ordre des gardes par
 * rapport aux autres policies : la capability d'abord, le scope ensuite. Le
 * résultat est le même, mais l'ordre compte pour qui lit le code en cherchant
 * un patron — d'où un test explicite sur les deux branches.
 */

testPolicyMatrix('InvoicePolicy (unit)', () => new InvoicePolicy(), [
  {
    name: 'create',
    capability: 'invoices.create',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'update',
    capability: 'invoices.update',
    allowedRoles: ['admin', 'member'],
    deniedRoles: ['mechanic', 'boat_owner'],
  },
  {
    name: 'delete',
    capability: 'invoices.delete',
    allowedRoles: ['admin'],
    deniedRoles: ['member', 'mechanic', 'boat_owner'],
  },
])

test.group('InvoicePolicy — optional invoice on view (unit)', () => {
  test('view without an invoice checks the capability alone', async ({ assert }) => {
    const policy = new InvoicePolicy()

    assert.isTrue(await policy.view(userWithCapabilities(ORG_ID, ['invoices.view'])))
    assert.isFalse(await policy.view(userWithCapabilities(ORG_ID, [])))
  })

  test('view guards the invoice organization', async ({ assert }) => {
    const policy = new InvoicePolicy()
    const user = userWithCapabilities(ORG_ID, ['invoices.view'])

    assert.isTrue(await policy.view(user, orgResource(ORG_ID) as never))
    assert.isFalse(await policy.view(user, orgResource(OTHER_ORG_ID) as never))
  })
})
