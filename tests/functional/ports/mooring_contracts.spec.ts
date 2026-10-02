import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import MooringContract from '#models/mooring_contract'
import type Spot from '#models/spot'
import { ClientFactory } from '#database/factories/client_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { PortFactory } from '#database/factories/port_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createEnterpriseAdminUser, createMemberUser } from '#tests/functional/helpers'
import type User from '#models/user'

/**
 * Contrats d'amarrage (#891) : un client, une place, une périodicité. La
 * facturation elle-même est testée sur le job
 * (`tests/integration/jobs/generate_mooring_contract_invoices.spec.ts`).
 */

async function setup(user: User) {
  const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()
  const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
  const spot = await SpotFactory.merge({
    organizationId: user.organizationId!,
    pontoonId: pontoon.id,
    name: 'B4',
  }).create()
  const customer = await ClientFactory.merge({ organizationId: user.organizationId! }).create()
  return { port, spot, customer }
}

function payload(spot: Spot, clientId: number, overrides: Record<string, unknown> = {}) {
  return {
    spotId: spot.id,
    clientId,
    startsOn: '2026-07-01',
    endsOn: '2027-06-30',
    periodicity: 'monthly',
    amount: 450,
    ...overrides,
  }
}

test.group('Contrats d’amarrage', (group) => {
  group.each.setup(() => truncateDb())

  test('un contrat démarre avec sa première échéance au jour de début', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot, customer } = await setup(user)

    const response = await client
      .post(`/ports/${port.id}/mooring-contracts`)
      .loginAs(user)
      .json(payload(spot, customer.id))
      .redirects(0)

    response.assertFlashMessage('success', 'Mooring contract recorded.')
    const contract = await MooringContract.query().firstOrFail()
    assert.equal(contract.status, 'active')
    assert.equal(contract.amount, 450)
    assert.equal(contract.nextInvoiceOn?.toISODate(), '2026-07-01')
    assert.equal(contract.organizationId, user.organizationId)
    assert.equal(contract.portId, port.id)
  })

  test('un seul contrat actif par place', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot, customer } = await setup(user)
    await client
      .post(`/ports/${port.id}/mooring-contracts`)
      .loginAs(user)
      .json(payload(spot, customer.id))

    const response = await client
      .post(`/ports/${port.id}/mooring-contracts`)
      .loginAs(user)
      .json(payload(spot, customer.id))
      .redirects(0)

    response.assertFlashMessage('error', 'An active contract already covers this berth.')
    assert.lengthOf(await MooringContract.all(), 1)
  })

  test("un client d'une autre organisation est refusé", async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const other = await createEnterpriseAdminUser()
    const { port, spot } = await setup(user)
    const foreign = await ClientFactory.merge({ organizationId: other.organizationId! }).create()

    const response = await client
      .post(`/ports/${port.id}/mooring-contracts`)
      .loginAs(user)
      .json(payload(spot, foreign.id))
      .redirects(0)

    response.assertFlashMessage('error', 'Client not found.')
    assert.lengthOf(await MooringContract.all(), 0)
  })

  test('résilier arrête la facturation, sans effacer le contrat', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const member = await createMemberUser(user.organizationId!)
    const { port, spot, customer } = await setup(user)
    const contract = await MooringContract.create({
      organizationId: user.organizationId!,
      portId: port.id,
      spotId: spot.id,
      clientId: customer.id,
      startsOn: DateTime.fromISO('2026-07-01'),
      periodicity: 'monthly',
      amount: 450,
      nextInvoiceOn: DateTime.fromISO('2026-08-01'),
      status: 'active',
    })

    await client
      .patch(`/ports/${port.id}/mooring-contracts/${contract.id}/terminate`)
      .loginAs(member)

    await contract.refresh()
    assert.equal(contract.status, 'terminated')
    assert.isNull(contract.nextInvoiceOn)
  })

  test('un contrat déjà facturé ne se supprime pas', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot, customer } = await setup(user)
    const invoice = await InvoiceFactory.merge({ organizationId: user.organizationId! })
      .apply('invoice')
      .create()
    const contract = await MooringContract.create({
      organizationId: user.organizationId!,
      portId: port.id,
      spotId: spot.id,
      clientId: customer.id,
      startsOn: DateTime.fromISO('2026-07-01'),
      periodicity: 'monthly',
      amount: 450,
      nextInvoiceOn: DateTime.fromISO('2026-08-01'),
      status: 'active',
      lastInvoiceId: invoice.id,
    })

    const response = await client
      .delete(`/ports/${port.id}/mooring-contracts/${contract.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertFlashMessage(
      'error',
      'This contract has already been invoiced: terminate it instead of deleting it.'
    )
    assert.isNotNull(await MooringContract.find(contract.id))
  })

  test('la fiche port expose la capitainerie', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { port, spot, customer } = await setup(user)
    await client
      .post(`/ports/${port.id}/mooring-contracts`)
      .loginAs(user)
      .json(payload(spot, customer.id))

    const response = await client.get(`/ports/${port.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      harbour: { contracts: { spotName: string }[]; occupancy: { totalSpots: number } }
      clients: { id: number }[]
    }
    assert.equal(props.harbour.contracts[0].spotName, 'B4')
    assert.equal(props.harbour.occupancy.totalSpots, 1)
    assert.deepEqual(
      props.clients.map((c) => c.id),
      [customer.id]
    )
  })
})
