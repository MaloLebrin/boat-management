import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import MooringContract from '#models/mooring_contract'
import GenerateMooringContractInvoices from '#jobs/generate_mooring_contract_invoices'
import MooringContractService from '#services/mooring_contract_service'
import { ClientFactory } from '#database/factories/client_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { PortFactory } from '#database/factories/port_factory'
import { SpotFactory } from '#database/factories/spot_factory'

/**
 * Facturation périodique des contrats d'amarrage — cron quotidien 05:45 (#891).
 *
 * Un contrat oublié par le job, c'est une place louée sans facture ; un
 * contrat facturé deux fois, c'est une relance envoyée à un client à jour.
 * D'où les trois propriétés figées ici : rattrapage des échéances manquées,
 * idempotence d'un second passage, arrêt à la fin du contrat.
 */

async function contract(attrs: Partial<MooringContract> = {}) {
  const org = await OrganizationFactory.create()
  const port = await PortFactory.merge({ organizationId: org.id }).create()
  const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
  const spot = await SpotFactory.merge({
    organizationId: org.id,
    pontoonId: pontoon.id,
    name: 'C7',
  }).create()
  const customer = await ClientFactory.merge({ organizationId: org.id }).create()
  return MooringContract.create({
    organizationId: org.id,
    portId: port.id,
    spotId: spot.id,
    clientId: customer.id,
    startsOn: DateTime.fromISO('2026-01-31'),
    periodicity: 'monthly',
    amount: 300,
    nextInvoiceOn: DateTime.fromISO('2026-01-31'),
    status: 'active',
    ...attrs,
  })
}

async function invoicesOf(c: MooringContract) {
  return Invoice.query().where('organizationId', c.organizationId).orderBy('issuedAt', 'asc')
}

async function runAt(today: string) {
  const service = await app.container.make(MooringContractService)
  return service.invoiceDueContracts(today, i18nManager.locale('en'))
}

test.group('GenerateMooringContractInvoices (cron 05:45)', () => {
  test('the job runs end to end on the real container', async ({ assert }) => {
    const c = await contract({
      startsOn: DateTime.now().startOf('day'),
      nextInvoiceOn: DateTime.now().startOf('day'),
    })

    const job = await app.container.make(GenerateMooringContractInvoices)
    await job.execute()

    assert.lengthOf(await invoicesOf(c), 1)
  })

  test('missed periods are caught up, one draft invoice each', async ({ assert }) => {
    const c = await contract()

    await runAt('2026-03-15')

    const invoices = await invoicesOf(c)
    assert.deepEqual(
      invoices.map((i) => i.issuedAt.toISODate()),
      ['2026-01-31', '2026-02-28']
    )
    assert.isTrue(invoices.every((i) => i.status === 'draft' && i.clientId === c.clientId))
    assert.equal(Number(invoices[0].subtotal), 300)

    const [line] = await InvoiceLine.query().where('invoiceId', invoices[0].id)
    assert.equal(line.label, 'Mooring contract — berth C7, from 01/31/2026 to 02/27/2026')

    await c.refresh()
    // Ancré sur le 31 : mars retrouve son 31, il ne reste pas bloqué au 28.
    assert.equal(c.nextInvoiceOn?.toISODate(), '2026-03-31')
    assert.equal(c.lastInvoiceId, invoices[1].id)
  })

  test('a second run the same day invoices nothing more', async ({ assert }) => {
    const c = await contract()

    assert.equal(await runAt('2026-02-10'), 1)
    assert.equal(await runAt('2026-02-10'), 0)

    assert.lengthOf(await invoicesOf(c), 1)
  })

  test('invoicing stops at the end of the contract, the last period ending on it', async ({
    assert,
  }) => {
    const c = await contract({
      startsOn: DateTime.fromISO('2026-01-01'),
      nextInvoiceOn: DateTime.fromISO('2026-01-01'),
      endsOn: DateTime.fromISO('2026-02-15'),
    })

    await runAt('2026-06-01')

    const invoices = await invoicesOf(c)
    assert.lengthOf(invoices, 2)
    const [line] = await InvoiceLine.query().where('invoiceId', invoices[1].id)
    assert.include(line.label, 'from 02/01/2026 to 02/15/2026')

    await c.refresh()
    assert.isNull(c.nextInvoiceOn)
  })

  test('a terminated contract is never invoiced', async ({ assert }) => {
    const c = await contract({ status: 'terminated' })

    await runAt('2026-06-01')

    assert.lengthOf(await invoicesOf(c), 0)
  })
})
